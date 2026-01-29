import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface MessageRequest {
  customers: Customer[];
  messageTemplate: string;
  businessName: string;
  messageType: "sms" | "whatsapp";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "Messaging not configured. Please add Twilio credentials.",
          sent: 0,
          failed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { customers, messageTemplate, businessName, messageType }: MessageRequest = await req.json();

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No customers provided", sent: 0, failed: 0 }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine the 'from' number based on message type
    const fromNumber = messageType === "whatsapp" 
      ? TWILIO_WHATSAPP_FROM || `whatsapp:${TWILIO_PHONE_NUMBER}`
      : TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      return new Response(
        JSON.stringify({ 
          error: "Phone number not configured for this message type",
          sent: 0,
          failed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send messages to each customer
    for (const customer of customers) {
      try {
        // Personalize message
        const personalizedMessage = messageTemplate
          .replace(/{name}/g, customer.name)
          .replace(/{business}/g, businessName);

        // Format phone number for WhatsApp if needed
        let toNumber = customer.phone;
        if (messageType === "whatsapp" && !toNumber.startsWith("whatsapp:")) {
          toNumber = `whatsapp:${toNumber}`;
        }

        // Send via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append("To", toNumber);
        formData.append("From", fromNumber);
        formData.append("Body", personalizedMessage);

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (twilioResponse.ok) {
          sent++;
          console.log(`Message sent to ${customer.name}`);
        } else {
          const errorData = await twilioResponse.json();
          console.error(`Failed to send to ${customer.name}:`, errorData);
          errors.push(`${customer.name}: ${errorData.message || "Unknown error"}`);
          failed++;
        }
      } catch (error) {
        console.error(`Error sending to ${customer.name}:`, error);
        errors.push(`${customer.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
        failed++;
      }
    }

    console.log(`Bulk message complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        sent, 
        failed, 
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-bulk-messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, sent: 0, failed: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
