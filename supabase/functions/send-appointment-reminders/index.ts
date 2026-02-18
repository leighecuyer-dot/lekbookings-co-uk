import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("RESEND_API_KEY not configured, skipping reminders");
    return new Response(JSON.stringify({ message: "Email service not configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;
  const resend = new Resend(apiKey);

  // Find bookings starting between 23 and 25 hours from now (1-hour window to avoid duplicates)
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_name,
      customer_email,
      start_time,
      business_id,
      service_id,
      status
    `)
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString())
    .in("status", ["pending", "confirmed"])
    .not("customer_email", "is", null);

  if (error) {
    console.error("Error fetching bookings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  console.log(`Found ${bookings?.length ?? 0} bookings to remind`);

  let sent = 0;
  let failed = 0;

  for (const booking of bookings ?? []) {
    if (!booking.customer_email || !booking.customer_name) continue;

    // Fetch service name
    let serviceName = "Appointment";
    if (booking.service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("name")
        .eq("id", booking.service_id)
        .single();
      if (service) serviceName = service.name;
    }

    // Fetch business name
    let businessName = "";
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", booking.business_id)
      .single();
    if (business) businessName = business.name;

    // Format date/time
    const startTime = new Date(booking.start_time);
    const dateStr = startTime.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = startTime.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    try {
      await resend.emails.send({
        from: "LEK Booking <noreply@resend.dev>",
        to: [booking.customer_email],
        subject: `Reminder: ${serviceName} tomorrow at ${timeStr}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Appointment Reminder</h1>
            </div>

            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${booking.customer_name},</p>

              <p style="margin-bottom: 20px;">Just a friendly reminder that you have an appointment <strong>tomorrow</strong>:</p>

              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${serviceName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${dateStr}</p>
                <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${timeStr}</p>
                ${businessName ? `<p style="margin: 0;"><strong>With:</strong> ${businessName}</p>` : ""}
              </div>

              <p style="color: #64748b; font-size: 14px;">
                If you need to cancel or reschedule, please contact us as soon as possible.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                This is an automated reminder from ${businessName || "LEK Booking System"}
              </p>
            </div>
          </body>
          </html>
        `,
      });
      sent++;
      console.log(`Reminder sent to ${booking.customer_email} for booking ${booking.id}`);
    } catch (e) {
      failed++;
      console.error(`Failed to send reminder for booking ${booking.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: bookings?.length ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

serve(handler);
