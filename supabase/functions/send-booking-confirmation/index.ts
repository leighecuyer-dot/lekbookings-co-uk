import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingConfirmationRequest {
  email: string;
  customerName: string;
  serviceName: string;
  dateTime: string;
  businessName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!apiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Using esm.sh for Resend
    const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;
    const resend = new Resend(apiKey);
    const { email, customerName, serviceName, dateTime, businessName }: BookingConfirmationRequest = await req.json();

    // Validate required fields
    if (!email || !customerName || !serviceName || !dateTime) {
      console.log("Missing required fields for email");
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "LEK Booking <noreply@resend.dev>",
      to: [email],
      subject: `Booking Confirmed: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed! ✓</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customerName},</p>
            
            <p style="margin-bottom: 20px;">Your appointment has been confirmed. Here are the details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 0 0 10px 0;"><strong>Date & Time:</strong> ${dateTime}</p>
              ${businessName ? `<p style="margin: 0;"><strong>Location:</strong> ${businessName}</p>` : ""}
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              If you need to make changes to your appointment, please contact us directly.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from LEK Booking System
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Booking confirmation email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending booking confirmation:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
