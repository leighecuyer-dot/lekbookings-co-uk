import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logMessage, getSupabaseClient } from "../_shared/messaging/utils.ts";
import { validateTwilioSignature, formDataToRecord } from "../_shared/messaging/twilio-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

interface TwilioWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia: string;
  ProfileName?: string;
}

// Keywords for detecting customer intent
const CONFIRM_KEYWORDS = ["yes", "confirm", "confirmed", "ok", "okay", "yep", "yeah", "y", "accept", "👍", "✅"];
const CANCEL_KEYWORDS = ["no", "cancel", "cancelled", "nope", "n", "decline", "cant", "can't", "cannot", "❌", "👎"];
const RESCHEDULE_KEYWORDS = ["reschedule", "change", "move", "different time", "another time"];
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "optout", "opt out", "quit", "cancel"];

function detectIntent(message: string): "confirm" | "cancel" | "reschedule" | "opt_out" | "unknown" {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for opt-out first (highest priority)
  if (OPT_OUT_KEYWORDS.some((kw) => lowerMessage === kw || lowerMessage.startsWith(kw + " "))) {
    return "opt_out";
  }
  
  // Check for reschedule
  if (RESCHEDULE_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return "reschedule";
  }
  
  // Check for cancel keywords
  if (CANCEL_KEYWORDS.some((kw) => lowerMessage === kw || lowerMessage.startsWith(kw + " "))) {
    return "cancel";
  }
  
  // Check for confirmation keywords
  if (CONFIRM_KEYWORDS.some((kw) => lowerMessage === kw || lowerMessage.startsWith(kw + " "))) {
    return "confirm";
  }
  
  return "unknown";
}

function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/^whatsapp:/, "");
  const hasPlus = normalized.startsWith("+");
  normalized = normalized.replace(/\D/g, "");
  return hasPlus ? `+${normalized}` : normalized;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Determine if this is WhatsApp or SMS based on the From number
function getChannel(from: string): "sms" | "whatsapp" {
  return from.startsWith("whatsapp:") ? "whatsapp" : "sms";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const payload: TwilioWebhookPayload = {
      From: formData.get("From")?.toString() || "",
      To: formData.get("To")?.toString() || "",
      Body: formData.get("Body")?.toString() || "",
      MessageSid: formData.get("MessageSid")?.toString() || "",
      AccountSid: formData.get("AccountSid")?.toString() || "",
      NumMedia: formData.get("NumMedia")?.toString() || "0",
      ProfileName: formData.get("ProfileName")?.toString(),
    };

    console.log("Received Twilio webhook:", {
      from: payload.From,
      body: payload.Body.substring(0, 100),
      messageSid: payload.MessageSid,
    });

    if (!payload.From || !payload.Body) {
      console.error("Missing required fields");
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    const supabase = getSupabaseClient();
    const customerPhone = normalizePhoneNumber(payload.From);
    const channel = getChannel(payload.From);
    const intent = detectIntent(payload.Body);
    
    console.log("Detected intent:", intent, "channel:", channel, "from message:", payload.Body);

    let responseMessage = "";

    // ============ Handle Opt-Out (STOP) ============
    if (intent === "opt_out") {
      console.log("Processing opt-out for phone:", customerPhone);
      
      // Call the database function to handle opt-out
      const { error: optOutError } = await supabase.rpc("handle_messaging_opt_out", {
        p_phone: customerPhone,
        p_channel: channel,
      });

      if (optOutError) {
        console.error("Error processing opt-out:", optOutError);
      }

      // Log the opt-out event
      const { data: customers } = await supabase
        .from("customers")
        .select("id, business_id")
        .or(`phone.ilike.%${customerPhone.slice(-10)}%`)
        .limit(1);

      if (customers && customers.length > 0) {
        await logMessage({
          business_id: customers[0].business_id,
          customer_id: customers[0].id,
          channel: channel,
          message_type: "marketing",
          provider: "twilio",
          provider_message_id: payload.MessageSid,
          status: "unsubscribed",
          recipient: customerPhone,
          message_preview: `Opt-out received: ${payload.Body}`,
        });
      }

      responseMessage = "You have been unsubscribed from marketing messages. You will still receive appointment confirmations and reminders. Reply START to re-subscribe.";
      
      console.log("Opt-out processed for:", customerPhone);
    }
    // ============ Handle Booking Confirmations/Cancellations ============
    else {
      // Find recent pending bookings for this phone number
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, business_id, customer_name, customer_phone, start_time, status")
        .or(`customer_phone.ilike.%${customerPhone.slice(-10)}%`)
        .eq("status", "pending")
        .gte("start_time", fourteenDaysAgo.toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      console.log("Found pending bookings:", bookings?.length || 0);

      if (!bookings || bookings.length === 0) {
        responseMessage = "We couldn't find any pending appointments for your number. Please contact us directly for assistance.";
      } else if (intent === "unknown") {
        responseMessage = `We received your message but couldn't understand your response. Please reply with "Yes" to confirm or "No" to cancel your appointment.`;
      } else if (intent === "confirm") {
        const booking = bookings[0];
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("id", booking.id);

        if (updateError) {
          console.error("Error updating booking:", updateError);
          throw updateError;
        }

        const bookingDate = new Date(booking.start_time).toLocaleDateString("en-GB", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        responseMessage = `✅ Your appointment on ${bookingDate} has been confirmed. We look forward to seeing you!`;
      } else if (intent === "cancel") {
        const booking = bookings[0];
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", booking.id);

        if (updateError) {
          console.error("Error updating booking:", updateError);
          throw updateError;
        }

        responseMessage = "Your appointment has been cancelled. Feel free to book again when you're ready!";
      } else if (intent === "reschedule") {
        responseMessage = "To reschedule your appointment, please contact us directly or visit our booking page. We'll be happy to find a new time that works for you!";
      }
    }

    // Return TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});
