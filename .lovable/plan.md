## Goal
On the public booking form success step, show a short human-readable booking reference and make sure a confirmation SMS is sent to the customer's phone whenever one was provided.

## Changes

### 1. Booking reference
- Derive a short reference from the client-generated `bookingId` (first 8 chars of the UUID, uppercased, e.g. `A1B2C3D4`). No DB change — the UUID is already the source of truth; this is a display formatting.
- Store it in component state when the insert succeeds and render it on the success step in `BookingFormModal.tsx`:
  - Prominent line: `Reference: A1B2C3D4`
  - "Copy" button (uses `navigator.clipboard`, toast on success).
- Include the reference in the existing success screen alongside date/time/service so the customer can quote it.

### 2. SMS on booking creation
Current flow: after anon insert, `send-booking-confirmation` is only invoked when a valid email is present. Server-side that function also fires SMS, so no-email-but-phone bookings currently get nothing.

Fix in `BookingFormModal.handleSubmit`:
- Always invoke `send-booking-confirmation` when the insert succeeds (drop the email guard). The edge function already looks up the booking server-side and no-ops the email step if there's no customer email; it will still send SMS when a phone is present and per-business SMS opt-in + tier cap allow it.
- Keep the current `confirmationSent` UX flag; extend it to reflect either email or SMS delivery (edge function response includes `emailSent` / `smsSent`).
- On the success screen, show one of:
  - "Confirmation sent to your email and phone"
  - "Confirmation sent to your phone"
  - "Confirmation sent to your email"
  - "Save your reference — we couldn't send a confirmation" (fallback)

No new tables, no new secrets — Twilio secrets are already configured, and `business_sms_settings` / tier caps already gate sending.

### 3. Minor
- Update the success-step copy to lead with the reference and delivery status.
- No changes to admin views, RLS, or migrations.

## Files touched
- `src/components/booking/public/BookingFormModal.tsx` — reference state + success-screen UI + always-invoke edge function.
- (Optional) `supabase/functions/send-booking-confirmation/index.ts` — ensure the response body includes `{ emailSent, smsSent }` so the UI can render an accurate status. Confirm current shape before editing; only touch if fields are missing.

## Out of scope
- No changes to owner/admin booking flow (they already see confirmations via existing hooks).
- No SMS opt-in UI changes on the public page — customers implicitly consent by providing a phone number for a transactional booking confirmation, which matches the current messaging-compliance model.
