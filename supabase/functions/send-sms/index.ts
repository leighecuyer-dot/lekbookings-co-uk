// Internal SMS dispatcher. Called by other edge functions (with service-role JWT)
// and by the client for status-change events. Enforces per-business opt-in,
// per-tier monthly caps, and STOP-keyword opt-outs.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EventType = "confirmation" | "reminder" | "cancellation" | "reschedule" | "test";

interface SendSmsBody {
  businessId: string;
  bookingId?: string;
  eventType: EventType;
  to: string;                // raw phone (E.164 preferred)
  tokens?: Record<string, string>; // template variables
  bodyOverride?: string;     // for "test" events
}

// SMS caps per tier (kept in sync with useSubscriptionTier.ts).
const TIER_CAPS: Record<string, number> = {
  free: 0,
  essential: 50,
  professional: 200,
  enterprise: 1000,
  unknown: 0,
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeE164(input: string, defaultCountry = "GB"): string | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/[\s\-()]/g, "");
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  // GB local: 07XXXXXXXXX -> +447XXXXXXXXX
  if (defaultCountry === "GB" && /^0\d{9,10}$/.test(trimmed)) {
    return `+44${trimmed.slice(1)}`;
  }
  if (/^\d{10,15}$/.test(trimmed)) return `+${trimmed}`;
  return null;
}

function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => tokens[key] ?? `{{${key}}}`);
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: SendSmsBody;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { businessId, bookingId, eventType, to, tokens = {}, bodyOverride } = payload;
  if (!businessId || !eventType || !to) {
    return json(400, { error: "businessId, eventType, to are required" });
  }

  // Auth: caller must either use service role, or be an owner/admin of businessId.
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
  let authorized = provided === serviceKey;
  if (!authorized) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u } = await userClient.auth.getUser();
    if (u?.user) {
      const { data: role } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("business_id", businessId)
        .in("role", ["owner", "admin"])
        .maybeSingle();
      authorized = !!role;
    }
  }
  if (!authorized) return json(403, { error: "Forbidden" });

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !fromNumber) {
    await admin.from("sms_log").insert({
      business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
      to_number: to, body: bodyOverride ?? "", status: "not_configured",
      error: "Twilio credentials missing",
    });
    return json(200, { status: "not_configured" });
  }

  // Load settings
  const { data: settings } = await admin
    .from("business_sms_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!settings || !settings.sms_enabled) {
    return json(200, { status: "disabled" });
  }
  if (eventType === "confirmation" && !settings.confirmation_enabled) return json(200, { status: "disabled" });
  if (eventType === "reminder" && !settings.reminder_enabled) return json(200, { status: "disabled" });
  if ((eventType === "cancellation" || eventType === "reschedule") && !settings.status_change_enabled) {
    return json(200, { status: "disabled" });
  }

  // Resolve template + body
  let body = bodyOverride ?? "";
  if (!body) {
    const tpl =
      eventType === "confirmation" ? settings.confirmation_template :
      eventType === "reminder" ? settings.reminder_template :
      eventType === "cancellation" ? settings.cancellation_template :
      eventType === "reschedule" ? settings.reschedule_template : "";
    body = renderTemplate(tpl, tokens);
  }
  if (!body.trim()) return json(200, { status: "empty_body" });

  // Normalize phone
  const e164 = normalizeE164(to);
  if (!e164) {
    await admin.from("sms_log").insert({
      business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
      to_number: to, body, status: "invalid_number",
    });
    return json(200, { status: "invalid_number" });
  }

  // Opt-out check
  const { data: optOut } = await admin
    .from("customer_sms_opt_out")
    .select("phone_e164")
    .eq("business_id", businessId)
    .eq("phone_e164", e164)
    .maybeSingle();
  if (optOut) {
    await admin.from("sms_log").insert({
      business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
      to_number: e164, body, status: "opted_out",
    });
    return json(200, { status: "opted_out" });
  }

  // Resolve tier cap
  let tier = "essential";
  const { data: rc } = await admin
    .from("reseller_clients")
    .select("subscription_tier")
    .eq("business_id", businessId)
    .maybeSingle();
  if (rc?.subscription_tier) tier = rc.subscription_tier;
  const cap = TIER_CAPS[tier] ?? 0;

  // Read/insert usage row
  const month = currentMonth();
  const { data: usageRow } = await admin
    .from("sms_usage")
    .select("id, sent_count, cap")
    .eq("business_id", businessId)
    .eq("month", month)
    .maybeSingle();

  const currentCount = usageRow?.sent_count ?? 0;
  if (currentCount >= cap) {
    await admin.from("sms_log").insert({
      business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
      to_number: e164, body, status: "over_cap",
    });
    return json(200, { status: "over_cap", cap, sent: currentCount });
  }

  // Fire to Twilio
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: e164, From: fromNumber, Body: body });
  const auth = btoa(`${sid}:${token}`);
  const resp = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const respBody = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    await admin.from("sms_log").insert({
      business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
      to_number: e164, body, status: "failed",
      error: respBody?.message ?? `HTTP ${resp.status}`,
    });
    return json(200, { status: "failed", error: respBody?.message ?? `HTTP ${resp.status}` });
  }

  // Bump usage counter
  if (usageRow) {
    await admin.from("sms_usage")
      .update({ sent_count: currentCount + 1, cap, updated_at: new Date().toISOString() })
      .eq("id", usageRow.id);
  } else {
    await admin.from("sms_usage").insert({
      business_id: businessId, month, sent_count: 1, cap,
    });
  }

  await admin.from("sms_log").insert({
    business_id: businessId, booking_id: bookingId ?? null, event_type: eventType,
    to_number: e164, body, status: "sent", provider_sid: respBody?.sid ?? null,
  });

  return json(200, { status: "sent", sid: respBody?.sid });
});
