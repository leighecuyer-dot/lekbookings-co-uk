import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHtml } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingConfirmationRequest {
  bookingId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { bookingId }: BookingConfirmationRequest = await req.json();
    if (!bookingId || typeof bookingId !== "string") {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Use service role to look up verified booking data. All content sent to the
    // recipient comes from our own database — never from the request payload —
    // which prevents attackers from using this endpoint to phish arbitrary
    // recipients through our sender domain.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("id, customer_email, customer_name, start_time, service_id, business_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ message: "Booking not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!booking.customer_email || !booking.customer_name) {
      return new Response(
        JSON.stringify({ message: "Missing customer email or name" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    let serviceName = "Appointment";
    if (booking.service_id) {
      const { data: svc } = await admin
        .from("services").select("name").eq("id", booking.service_id).maybeSingle();
      if (svc?.name) serviceName = svc.name;
    }

    let businessName = "";
    const { data: biz } = await admin
      .from("businesses").select("name").eq("id", booking.business_id).maybeSingle();
    if (biz?.name) businessName = biz.name;

    const startTime = new Date(booking.start_time);
    const dateTime = startTime.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;
    const resend = new Resend(apiKey);

    const safeName = escapeHtml(booking.customer_name);
    const safeService = escapeHtml(serviceName);
    const safeDateTime = escapeHtml(dateTime);
    const safeBusiness = escapeHtml(businessName);

    const emailResponse = await resend.emails.send({
      from: "LEK Booking <onboarding@resend.dev>",
      to: [booking.customer_email],
      subject: `Booking Confirmed: ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed! ✓</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${safeName},</p>
            <p style="margin-bottom: 20px;">Your appointment has been confirmed. Here are the details:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${safeService}</p>
              <p style="margin: 0 0 10px 0;"><strong>Date & Time:</strong> ${safeDateTime}</p>
              ${businessName ? `<p style="margin: 0;"><strong>Location:</strong> ${safeBusiness}</p>` : ""}
            </div>
            <p style="color: #64748b; font-size: 14px;">If you need to make changes to your appointment, please contact us directly.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This is an automated message from LEK Booking System</p>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending booking confirmation:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to send confirmation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
