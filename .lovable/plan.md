
## Goal

Confirm email sending actually works today, and turn WhatsApp on by wiring the already-implemented `TwilioProvider` into the messaging dispatcher.

## Part 1 — Verify email

1. Call the deployed `send-message` function with a small transactional email payload against a real test recipient you provide (or a seeded internal address).
2. Read the function response + `supabase edge_function_logs` + Brevo API response fields.
3. Also spot-check the `message_logs` table row that gets written to confirm status = `sent`.
4. Report the observed result. No code changes unless the test surfaces a bug.

If the test fails, the plan for the fix will be added as a follow-up (most likely a missing/expired `BREVO_API_KEY` or a sender-domain issue — both are config, not code).

## Part 2 — Enable WhatsApp via Twilio

The `TwilioProvider` already implements `sendTransactionalWhatsApp` and `sendMarketingWhatsApp`. It just isn't instantiated by the dispatcher.

### Secrets required (requested via `add_secret`)

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` — the WhatsApp-enabled sender number in E.164 form, e.g. `+441234567890` (the provider prefixes `whatsapp:` automatically)
- `TWILIO_SMS_FROM` — optional; if omitted we fall back to `TWILIO_WHATSAPP_FROM` for the SMS constructor slot (SMS stays disabled at the dispatcher level, so this is inert)

If any of these are missing, WhatsApp sends will continue to return the current "not configured" error — no crash.

### Code changes (`supabase/functions/_shared/messaging/index.ts`)

1. Import `TwilioProvider`.
2. Add `getWhatsAppProvider()` factory:
   - Reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.
   - Returns `null` (with a `console.warn`) if any is missing.
   - Otherwise returns `new TwilioProvider(sid, token, smsFrom ?? whatsappFrom, whatsappFrom)`.
3. Replace the hard-coded error body of `sendTransactionalWhatsApp`:
   - Run `canSendTransactional(customerId, businessId, "whatsapp")` first (same shape as email/SMS).
   - If no provider → return the existing "not configured" error so nothing regresses when secrets are unset.
   - Otherwise delegate to `provider.sendTransactionalWhatsApp(params)`.
4. Replace `sendMarketingWhatsAppCampaign` similarly:
   - If no provider → return the current failure `CampaignResult` unchanged.
   - Otherwise delegate to `provider.sendMarketingWhatsApp(params)` (opt-in and rate-limit checks are handled inside the provider, matching SMS behaviour).

No changes to `send-message/index.ts`, to types, to `utils.ts`, or to any frontend code — the WhatsApp branches in `send-message` already forward to these two functions.

### Deploy + test

1. Deploy `send-message` (it re-bundles `_shared/messaging`).
2. Call `send-message` with `{ type: "transactional", channel: "whatsapp", template: "<approved-template-name>", recipient: "<your test WhatsApp number>", ... }`.
3. Read the function logs and the `message_logs` row (`provider = "twilio"`, `status = "sent"`, `provider_message_id` populated).
4. Report the Twilio SID + delivery status back to you.

## What I need from you before Part 2 runs

- The three Twilio secrets above (I'll request them via `add_secret` so they're stored securely; do not paste them in chat).
- One WhatsApp test recipient number (E.164) and one approved WhatsApp template name registered on your Twilio sender.

## Out of scope

- Turning SMS on (project memory says SMS is intentionally off; leaving it that way).
- Any UI changes — the existing WhatsApp buttons already call `send-message`, so once the dispatcher is wired they start working with no frontend edits.
- Changing the Brevo email path (only touched if Part 1 uncovers a real failure).
