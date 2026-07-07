
# Bug Fixes: Public Booking, Kanban, Validation & UX

Six focused fixes across DB policies, one hook, three components, and one page. No new features; no design changes.

## 1. Critical — Public booking page 401 on services

**Root cause (confirmed via `curl` + `pg_proc`):** the `public.services` and `public.service_categories` tables have three permissive `SELECT` policies each. Two of them are anon-safe (`is_active = true`), but the third — `"Users can view services"` / `"Users can view their categories"` — calls `public.get_user_business_ids(auth.uid())`, and **anon has no `EXECUTE` on that function**. Postgres evaluates every permissive policy for the OR, so anon requests fail with `42501 permission denied for function get_user_business_ids` — a 401 at PostgREST. Same function is also used by the `bookings` "Users can view" policy but only authenticated users read bookings, so it isn't hit.

**Fix (migration):** re-create those two `SELECT` policies scoped to `TO authenticated` only. The anon-only "Anyone can view active …" policies remain untouched, so the public booking page keeps read access to active rows for a business slug.

```sql
DROP POLICY "Users can view services" ON public.services;
CREATE POLICY "Users can view services" ON public.services
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.get_user_business_ids(auth.uid())));

DROP POLICY "Users can view their categories" ON public.service_categories;
CREATE POLICY "Users can view their categories" ON public.service_categories
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.get_user_business_ids(auth.uid())));
```

Verification: replay the anon `curl` against `/rest/v1/services?...&is_active=eq.true` — expect 200; sign in as owner and confirm `/services` still lists everything.

## 2. Critical — Kanban shows 0 bookings

The Kanban query pulls all bookings for the business with no date filter, but `KanbanView` groups by `getEffectiveStatus(b)` which returns `booking.status` — data exists (15 confirmed, 2 pending, 1 completed per DB), so columns should populate. I could not reproduce from static analysis; the render path is sound.

**Fix approach:** during implementation, drive Playwright against `/kanban` to capture the actual `bookings` array in `KanbanPage`. The two realistic culprits are:
- `bookingsRes.data` returning `[]` due to a RLS/permission failure — apply the same policy hygiene as #1 if the `"Users can view bookings"` policy shows the same anon-function trap for authenticated calls, or
- an unexpected `booking.status` value (e.g. trimmed/casing) that doesn't match column ids.

Fix whichever the runtime reveals; no speculative code change here. Verify column counts equal Dashboard's `today_bookings` / `pending_bookings`.

## 3. High — Email format validation on booking creation

Add a shared validator and apply in three places:

- `src/lib/validation.ts` (new): `isValidEmail(s) = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())`.
- **Admin quick-create** (`src/pages/calendar/CalendarPage.tsx` `handleCreateBooking`, `src/pages/calendar/KanbanPage.tsx` `handleCreateBooking`): before insert, if `customerEmail` is non-empty and invalid → `toast.error("Enter a valid email")` and return.
- **Public booking** (`src/components/booking/public/BookingFormModal.tsx`): on the contact step, block "Next"/"Confirm" when `formData.email` is non-empty and invalid; show inline red helper text. On success, only render "A confirmation email has been sent to …" when the email is valid AND the `send-booking-confirmation` invoke resolved without error — track a `confirmationSent` boolean and gate the copy on it.

## 4. High — Past-date protection in admin New Booking

`CalendarPage`'s New Booking modal reuses `selectedDate` from the calendar and only lets the user pick a time. In `handleCreateBooking`, add: `if (startTime < startOfDay(new Date())) { toast.error("Cannot book in the past"); return; }`. In `KanbanPage`'s modal (which exposes a `<Input type="date">` for `newBooking.date`), add `min={new Date().toISOString().split("T")[0]}` on the input AND the same runtime guard before insert.

## 5. Medium — New Booking modal cut-off

The two "Create New Booking" `DialogContent`s (`CalendarPage.tsx` line 373, `KanbanPage.tsx` line 272) render a long form without vertical bounds. Change both to:

```tsx
<DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
  <DialogHeader className="p-6 pb-2">…</DialogHeader>
  <div className="flex-1 overflow-y-auto px-6 space-y-4">…form fields…</div>
  <div className="p-6 pt-4 border-t">
    <Button onClick={handleCreateBooking} className="w-full gradient-primary">Create Booking</Button>
  </div>
</DialogContent>
```

Keeps the submit button pinned; body scrolls when the viewport is short.

## 6. Medium — Settings Phone/Email stacking on mobile

`src/pages/settings/SettingsPage.tsx` line 241: change `<div className="grid grid-cols-2 gap-4">` wrapping Phone + Email to `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">`. Matches how other sections stack.

## Files touched

- migration (policies for services + service_categories, plus #2 if the runtime confirms a policy issue on bookings)
- `src/lib/validation.ts` (new)
- `src/pages/calendar/CalendarPage.tsx`
- `src/pages/calendar/KanbanPage.tsx`
- `src/components/booking/public/BookingFormModal.tsx`
- `src/pages/settings/SettingsPage.tsx`

## Verification

- Anon `curl` to `services` returns 200; public `/book/:slug` lists services in an incognito window.
- Kanban column counts equal Dashboard counts after diagnosis fix.
- Typing `notanemail` on either booking form blocks submit with an inline error; confirmation screen omits "email sent" copy on failure.
- Selecting yesterday in Kanban's date input is disabled; admin submit rejects past times with toast.
- Resize preview to ~600px tall — Create Booking submit button remains visible and clickable.
- Settings on 375px width: Phone and Email stack vertically.
