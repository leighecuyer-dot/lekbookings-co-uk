# Plan: Email-only fallback while Twilio is fixed

## Goal
Make sure Guild Hair can go live tomorrow even though their Twilio number has no SMS capability. Customer booking confirmations must still work via email, and the owner must be able to turn SMS off with one click while keeping email on.

## What we will change

### 1. SMS settings page — one-click email-only mode
File: `src/components/settings/SMSNotificationsSection.tsx`
- Add a clear status banner at the top:
  - Green: SMS is enabled and configured.
  - Amber: SMS is enabled but the Twilio sender is missing / not SMS-capable.
  - Grey: SMS is off — confirmations are email-only.
- Add a prominent button: **"Use email only for now"** that sets `sms_enabled = false` and saves.
- Add a matching **"Turn SMS back on"** button when it is disabled.
- Keep all templates saved so they can be re-enabled later without retyping.

### 2. Booking confirmation edge function — skip SMS gracefully when off
File: `supabase/functions/send-booking-confirmation/index.ts`
- Before calling `send-sms`, read `business_sms_settings`.
- If `sms_enabled` is false, return `smsSent: false` immediately without calling Twilio.
- If `sms_enabled` is true but the `send-sms` call returns `not_configured` or `failed`, still return `emailSent: true` and `smsSent: false` so the UI shows the email-only message.

### 3. Customer success screen — clearer email-only wording
File: `src/components/booking/public/BookingFormModal.tsx`
- Keep the existing logic but make the message friendlier when only email is sent:
  - "Confirmation sent to your email." becomes "Confirmation sent to your email. We'll add SMS once the sender is ready."
- Keep the reference number copy block unchanged.

### 4. Status-change SMS already respects settings
`useBookingActions.ts` calls `send-sms`, which already returns `disabled` when `sms_enabled` is false. No change needed unless the edge-function update reveals a gap.

## Verification
- Run TypeScript check.
- Deploy `send-booking-confirmation` edge function.
- Create a test booking with SMS disabled and confirm the success screen says the email was sent.

## Out of scope
- Fixing Twilio account upgrade (owner must upgrade in Twilio console).
- Changing email templates or email infrastructure.
- Adding new database tables.
