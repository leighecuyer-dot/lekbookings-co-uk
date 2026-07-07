
# SMS Notifications — Reactivate & Ship

Turns Twilio SMS back on for **booking confirmations, 24h reminders, and status changes (cancel/reschedule)**, with per-business opt-in, editable templates, and hard monthly caps enforced by subscription tier.

## Secrets

Request three secrets before deploy (via `add_secret`): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Nothing sends until all three exist.

## Database (one migration)

```
business_sms_settings           per business
  business_id (unique)          settings for one business
  sms_enabled boolean           master on/off (default false)
  confirmation_enabled boolean  event toggles
  reminder_enabled boolean
  status_change_enabled boolean
  confirmation_template text    handlebar-style {{customer_name}} etc
  reminder_template text
  cancellation_template text
  reschedule_template text
  sender_name text              short alphanumeric prepended if provider allows

sms_usage                        rolling monthly counter
  business_id, month (YYYY-MM)   composite unique
  sent_count int
  cap int                        snapshot of tier cap at first send of month

sms_log                          audit + STOP handling
  business_id, booking_id, to_number, body, status, provider_sid, error, sent_at

customer_sms_opt_out             STOP keyword blocklist
  business_id, phone_e164 (composite pk), opted_out_at
```

RLS: owners/admins read+write settings for their business; staff read-only; service role bypass. All GRANTs included. `sms_usage` and `sms_log` are read-only from client (writes only via edge functions using service role).

Tier caps (hard-coded in edge function, per `subscription-tiers-uk` memory):
- Free: 0 (SMS unavailable)
- Essential: 50/mo
- Pro: 200/mo
- Enterprise: 1000/mo

## Edge functions

1. **`send-sms`** (internal helper, not publicly invokable) — accepts `{ business_id, to, body, booking_id, event_type }`:
   - Load business + tier + `business_sms_settings`; return early if disabled or event toggled off.
   - Normalize `to` to E.164 (default GB); return `invalid_number` if not parseable.
   - Check `customer_sms_opt_out`; return `opted_out` if matched.
   - Increment/read `sms_usage` for current month; if `sent_count >= cap` → log `over_cap` and return without sending.
   - POST to Twilio Messages API with Basic Auth (SID+token); on success bump counter and insert `sms_log` row with status `sent`; on failure log `failed` with Twilio error.

2. **`send-booking-confirmation`** (existing) — after email, invoke `send-sms` with `confirmation` template rendered from booking data.

3. **`send-appointment-reminders`** (existing pg_cron function) — extend to also fire `send-sms` with `reminder` template for bookings 24h out where reminder hasn't sent.

4. **`twilio-webhook`** (existing) — extend inbound handler: on `STOP`/`UNSUBSCRIBE`/`STOPALL` insert into `customer_sms_opt_out` and reply with confirmation; on `START` remove the row. HMAC-SHA1 verify per existing pattern.

Status-change SMS is fired from a small trigger in `useBookingActions.updateStatus` (client → invoke `send-sms` with `cancellation` or `reschedule` template).

## Template engine

Tiny in-function renderer: replace `{{customer_name}}`, `{{business_name}}`, `{{service_name}}`, `{{staff_name}}`, `{{start_time}}` (formatted `EEE d MMM, HH:mm`), `{{booking_url}}`. Unknown tokens left as-is. Char count check — warn in UI at >160.

Defaults:
- Confirmation: `Hi {{customer_name}}, your {{service_name}} at {{business_name}} is booked for {{start_time}}. Reply STOP to opt out.`
- Reminder: `Reminder: {{service_name}} at {{business_name}} tomorrow at {{start_time}}. See you then!`
- Cancellation: `Your {{service_name}} on {{start_time}} at {{business_name}} has been cancelled.`
- Reschedule: `Your {{service_name}} at {{business_name}} has been rescheduled to {{start_time}}.`

## UI (owner-only, respects existing `TeamPermissionsSection` / `PagePermissionGate`)

**New section in `SettingsPage` → "SMS Notifications":**
- Master toggle `Enable SMS`. Disabled + inline copy if tier is Free ("Upgrade to Essential to enable SMS").
- Three event toggles (Confirmation / 24h Reminder / Status changes).
- Four `<Textarea>`s (one per template) with live token help chips and char count.
- Monthly usage bar: `{sent} / {cap} SMS used this month`; red when 100%.
- "Send test SMS to my number" button (uses admin's phone).

`SettingsPage` gets a new tab or accordion `<SMSNotificationsSection />`.

## Files

- `supabase/migrations/…` — the tables above with grants + RLS.
- `supabase/functions/send-sms/index.ts` (new).
- `supabase/functions/send-booking-confirmation/index.ts` (extend).
- `supabase/functions/send-appointment-reminders/index.ts` (extend).
- `supabase/functions/twilio-webhook/index.ts` (extend STOP/START).
- `src/hooks/sms/useSmsSettings.ts` (new).
- `src/components/settings/SMSNotificationsSection.tsx` (new).
- `src/pages/settings/SettingsPage.tsx` (mount section, owner-only).
- `src/hooks/bookings/useBookingActions.ts` (invoke `send-sms` on status flip when enabled).
- `src/integrations/supabase/types.ts` (regenerated by migration).

## Secrets flow

Kick off with `secrets--add_secret` for the three Twilio values. If the user cancels, ship everything except the actual sends — the edge function returns `not_configured` and the UI shows a "Twilio credentials missing — contact support" state.

## Verification

- Toggle SMS off → creating a booking sends email only, no `sms_log` row.
- Toggle SMS on with valid credentials → confirmation SMS arrives; `sms_usage.sent_count` = 1; `sms_log` shows `sent`.
- Fire 24h-reminder cron manually via `supabase--curl_edge_functions` → reminder SMS row appears.
- Cancel a booking → cancellation SMS logged.
- Exceed cap in test → next attempt logs `over_cap` and no Twilio call is made.
- Reply STOP from a test phone → row appears in `customer_sms_opt_out`; next attempt to same number logs `opted_out`.
- Free-tier business → toggle disabled in UI; edge function refuses.
