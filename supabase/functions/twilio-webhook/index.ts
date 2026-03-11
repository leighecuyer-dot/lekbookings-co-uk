import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  ProfileName?: string; // WhatsApp display name
}

// Keywords for detecting customer intent
const CONFIRM_KEYWORDS = ["yes", "confirm", "confirmed", "ok", "okay", "yep", "yeah", "y", "accept", "👍", "✅"];
const CANCEL_KEYWORDS = ["no", "cancel", "cancelled", "nope", "n", "decline", "cant", "can't", "cannot", "❌", "👎"];
const RESCHEDULE_KEYWORDS = ["reschedule", "change", "move", "different time", "another time"];

function detectIntent(message: string): "confirm" | "cancel" | "reschedule" | "unknown" {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for reschedule first (higher priority)
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
  // Remove WhatsApp prefix if present
  let normalized = phone.replace(/^whatsapp:/, "");
  // Remove all non-digit characters except leading +
  const hasPlus = normalized.startsWith("+");
  normalized = normalized.replace(/\D/g, "");
  return hasPlus ? `+${normalized}` : normalized;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data (Twilio sends as application/x-www-form-urlencoded)
    const formData = await req.formData();

    // Validate Twilio signature
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!twilioAuthToken) {
      console.error("TWILIO_AUTH_TOKEN not configured — rejecting request");
      return new Response("Service unavailable", { status: 503, headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/twilio-webhook`;
    const params = formDataToRecord(formData);
    const isValid = await validateTwilioSignature(req, twilioAuthToken, webhookUrl, params);
    if (!isValid) {
      console.error("Invalid Twilio signature — rejecting request");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

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

    // Validate required fields
    if (!payload.From || !payload.Body) {
      console.error("Missing required fields");
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize the phone number
    const customerPhone = normalizePhoneNumber(payload.From);
    
    // Detect customer intent
    const intent = detectIntent(payload.Body);
    console.log("Detected intent:", intent, "from message:", payload.Body);

    // Find recent pending bookings for this phone number
    // Look for bookings in the last 14 days that are pending
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

    let responseMessage = "";
    let updatedBookingId: string | null = null;
    let newStatus: string | null = null;

    if (!bookings || bookings.length === 0) {
      // No pending bookings found
      responseMessage = "We couldn't find any pending appointments for your number. Please contact us directly for assistance.";
    } else if (intent === "unknown") {
      // Couldn't understand the message
      responseMessage = `We received your message but couldn't understand your response. Please reply with "Yes" to confirm or "No" to cancel your appointment.`;
    } else if (intent === "confirm") {
      // Confirm the most recent pending booking
      const booking = bookings[0];
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw updateError;
      }

      updatedBookingId = booking.id;
      newStatus = "confirmed";
      
      const bookingDate = new Date(booking.start_time).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      responseMessage = `✅ Your appointment on ${bookingDate} has been confirmed. We look forward to seeing you!`;
    } else if (intent === "cancel") {
      // Cancel the most recent pending booking
      const booking = bookings[0];
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw updateError;
      }

      updatedBookingId = booking.id;
      newStatus = "cancelled";
      responseMessage = "Your appointment has been cancelled. Feel free to book again when you're ready!";
    } else if (intent === "reschedule") {
      // For reschedule, we just acknowledge and suggest contacting the business
      responseMessage = "To reschedule your appointment, please contact us directly or visit our booking page. We'll be happy to find a new time that works for you!";
    }

    // Log the webhook processing result
    console.log("Webhook processed:", {
      phone: customerPhone,
      intent,
      updatedBookingId,
      newStatus,
    });

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
    
    // Return empty TwiML response on error (don't expose errors to sender)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      }
    );
  }
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
