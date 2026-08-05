import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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
      .select("id, customer_email, customer_name, customer_phone, start_time, service_id, staff_id, business_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ message: "Booking not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!booking.customer_name) {
      return new Response(
        JSON.stringify({ message: "Missing customer name", emailSent: false, smsSent: false }),
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
    let businessPhone = "";
    let businessAddress = "";
    const { data: biz } = await admin
      .from("businesses").select("name, phone, address").eq("id", booking.business_id).maybeSingle();
    if (biz?.name) businessName = biz.name;
    if (biz?.phone) businessPhone = biz.phone;
    if (biz?.address) businessAddress = biz.address;

    let staffName = "";
    if (booking.staff_id) {
      const { data: st } = await admin
        .from("staff").select("name").eq("id", booking.staff_id).maybeSingle();
      if (st?.name) staffName = st.name;
    }

    const startTime = new Date(booking.start_time);
    const dateTime = startTime.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    let emailSent = false;
    let smsSent = false;

    if (booking.customer_email) {
      try {
        const { error: emailError } = await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: booking.customer_email,
            idempotencyKey: `booking-confirmation-${booking.id}`,
            templateData: {
              customerName: booking.customer_name,
              businessName,
              serviceName,
              dateTime,
              reference: booking.id.slice(0, 8).toUpperCase(),
              staffName,
              address: businessAddress,
              phone: businessPhone,
            },
          },
        });
        emailSent = !emailError;
        if (emailError) console.log("Email send failed:", emailError);
      } catch (e) {
        console.log("Email send failed:", e);
      }
    }



    // Send SMS confirmation (respects per-business opt-in + tier caps).
    if (booking.customer_phone) {
      try {
        const smsUrl = `${supabaseUrl}/functions/v1/send-sms`;
        const smsRes = await fetch(smsUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: booking.business_id,
            bookingId: booking.id,
            eventType: "confirmation",
            to: booking.customer_phone,
            tokens: {
              customer_name: booking.customer_name,
              service_name: serviceName,
              business_name: businessName,
              start_time: dateTime,
              reference: booking.id.slice(0, 8).toUpperCase(),
            },
          }),
        });
        smsSent = smsRes.ok;
      } catch (e) {
        console.log("SMS confirmation skipped:", e);
      }
    }

    // ---- Internal alerts (owner + assigned staff) -------------------------
    const reference = booking.id.slice(0, 8).toUpperCase();

    const sendAlertEmail = async (to: string, recipientName: string, key: string) => {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-alert",
            recipientEmail: to,
            idempotencyKey: `booking-alert-${key}-${booking.id}`,
            templateData: {
              recipientName,
              businessName,
              customerName: booking.customer_name,
              customerPhone: booking.customer_phone ?? "",
              serviceName,
              dateTime,
              staffName,
              reference,
              alertKind: "New booking",
            },
          },
        });
      } catch (e) {
        console.log("Alert email skipped:", e);
      }
    };

    const sendAlertSms = async (to: string) => {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: booking.business_id,
            bookingId: booking.id,
            eventType: "test",
            to,
            bodyOverride:
              `New booking: ${booking.customer_name} — ${serviceName} on ${dateTime}` +
              (staffName ? ` with ${staffName}` : "") + `. Ref ${reference}`,
          }),
        });
      } catch (e) {
        console.log("Alert SMS skipped:", e);
      }
    };

    try {
      const { data: notify } = await admin
        .from("business_notification_settings")
        .select("*")
        .eq("business_id", booking.business_id)
        .maybeSingle();

      if (notify?.notify_new_booking) {
        const ownerEmail = notify.owner_email || biz?.email || "";
        if (notify.owner_channel_email && ownerEmail) {
          await sendAlertEmail(ownerEmail, "there", "owner");
        }
        const ownerPhone = notify.owner_phone || businessPhone;
        if (notify.owner_channel_sms && ownerPhone) {
          await sendAlertSms(ownerPhone);
        }
      }

      if (notify?.staff_alerts_enabled && booking.staff_id) {
        const { data: st } = await admin
          .from("staff").select("name, email, phone").eq("id", booking.staff_id).maybeSingle();
        if (notify.staff_alert_channel_email && st?.email) {
          await sendAlertEmail(st.email, st.name ?? "there", "staff");
        }
        if (notify.staff_alert_channel_sms && st?.phone) {
          await sendAlertSms(st.phone);
        }
      }
    } catch (e) {
      console.log("Internal alerts skipped:", e);
    }


    return new Response(JSON.stringify({ emailSent, smsSent }), {
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
