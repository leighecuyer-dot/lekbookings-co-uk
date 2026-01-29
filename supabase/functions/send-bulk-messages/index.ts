import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface MessageRequest {
  customers: Customer[];
  messageTemplate: string;
  emailSubject?: string;
  businessName: string;
  messageType: "sms" | "whatsapp" | "email";
}

const sendEmailCampaign = async (
  customers: Customer[],
  messageTemplate: string,
  emailSubject: string,
  businessName: string,
  resendApiKey: string
): Promise<{ sent: number; failed: number; errors: string[] }> => {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const customer of customers) {
    if (!customer.email) {
      errors.push(`${customer.name}: No email address`);
      failed++;
      continue;
    }

    try {
      const personalizedMessage = messageTemplate
        .replace(/{name}/g, customer.name)
        .replace(/{business}/g, businessName);

      const personalizedSubject = emailSubject
        .replace(/{name}/g, customer.name)
        .replace(/{business}/g, businessName);

      // Convert plain text to HTML (preserve line breaks)
      const htmlMessage = personalizedMessage
        .split('\n')
        .map(line => `<p>${line || '&nbsp;'}</p>`)
        .join('');

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${businessName} <noreply@resend.dev>`,
          to: [customer.email],
          subject: personalizedSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${htmlMessage}
            </div>
          `,
        }),
      });

      if (response.ok) {
        sent++;
        console.log(`Email sent to ${customer.name} (${customer.email})`);
      } else {
        const errorData = await response.json();
        console.error(`Failed to send email to ${customer.name}:`, errorData);
        errors.push(`${customer.name}: ${errorData.message || "Unknown error"}`);
        failed++;
      }
    } catch (error) {
      console.error(`Error sending email to ${customer.name}:`, error);
      errors.push(`${customer.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      failed++;
    }
  }

  return { sent, failed, errors };
};

const sendSmsOrWhatsApp = async (
  customers: Customer[],
  messageTemplate: string,
  businessName: string,
  messageType: "sms" | "whatsapp",
  twilioAccountSid: string,
  twilioAuthToken: string,
  fromNumber: string
): Promise<{ sent: number; failed: number; errors: string[] }> => {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const customer of customers) {
    if (!customer.phone) {
      errors.push(`${customer.name}: No phone number`);
      failed++;
      continue;
    }

    try {
      const personalizedMessage = messageTemplate
        .replace(/{name}/g, customer.name)
        .replace(/{business}/g, businessName);

      let toNumber = customer.phone;
      if (messageType === "whatsapp" && !toNumber.startsWith("whatsapp:")) {
        toNumber = `whatsapp:${toNumber}`;
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append("To", toNumber);
      formData.append("From", fromNumber);
      formData.append("Body", personalizedMessage);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (twilioResponse.ok) {
        sent++;
        console.log(`${messageType.toUpperCase()} sent to ${customer.name}`);
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

  return { sent, failed, errors };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customers, messageTemplate, emailSubject, businessName, messageType }: MessageRequest = await req.json();

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No customers provided", sent: 0, failed: 0 }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result: { sent: number; failed: number; errors: string[] };

    if (messageType === "email") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      
      if (!RESEND_API_KEY) {
        console.error("Resend API key not configured");
        return new Response(
          JSON.stringify({ 
            error: "Email not configured. Please add RESEND_API_KEY.",
            sent: 0,
            failed: 0
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      result = await sendEmailCampaign(
        customers,
        messageTemplate,
        emailSubject || "Message from " + businessName,
        businessName,
        RESEND_API_KEY
      );
    } else {
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

      result = await sendSmsOrWhatsApp(
        customers,
        messageTemplate,
        businessName,
        messageType,
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        fromNumber
      );
    }

    console.log(`Bulk ${messageType} campaign complete: ${result.sent} sent, ${result.failed} failed`);

    return new Response(
      JSON.stringify({ 
        sent: result.sent, 
        failed: result.failed, 
        errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined 
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
