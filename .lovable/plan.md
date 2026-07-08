## Goal
Confirm a booking created anonymously from `/book/:slug` shows up straight away in the owner's admin views (Day/Week calendar and Kanban) at the right time slot, staff, and status.

## Verification steps

1. **Pick a test business**
   - Query `businesses` for a slug that has at least one active service and one active staff member.
   - Note its `id`, a `service_id`, and a `staff_id`.

2. **Create a booking as anonymous (simulating the public page)**
   - Use the anon key against `POST /rest/v1/bookings` with the same payload shape `BookingFormModal` sends: client-generated `id` (uuid), `business_id`, `service_id`, `staff_id`, `customer_name`, `start_time`, `end_time`, `status: 'pending'`, `payment_status: 'unpaid'`.
   - Confirm HTTP 201 and no RLS error. Record the `id` and `start_time`.

3. **Verify DB persistence (owner view)**
   - `SELECT` the row via `supabase--read_query` to confirm it landed with the expected `business_id`, `staff_id`, `start_time`, `status='pending'`.

4. **Verify admin UI queries return it**
   - Reproduce the exact fetches used by:
     - `CalendarPage` / `DayTimelineView` (bookings for that day + business, joined with service/staff)
     - `WeekPage` / `WeekView` (bookings within the week window)
     - `KanbanPage` / `KanbanView` (pending column, no date filter per project memory)
   - Confirm the new row is included in each result set.

5. **Verify the live UI with Playwright** (only if signed-in session is available; `LOVABLE_BROWSER_AUTH_STATUS=injected`)
   - Restore the owner session, navigate to `/calendar`, `/week`, `/kanban`.
   - Screenshot each and confirm the booking card is visible in the right slot / column.
   - If `LOVABLE_BROWSER_AUTH_STATUS` is `signed_out` or `external_unmanaged`, skip this step and rely on the DB + query-level verification, and report that limitation.

6. **Report**
   - For each view: pass/fail with evidence (row count, screenshot path, or query result).
   - If any view is missing the booking, diagnose (RLS on read, date filter, staff filter, cache) and note the fix — no code changes in plan mode.

## Notes
- No schema or code changes are planned; this is a read-only verification pass.
- The recent fix (client-generated `id`, no `.select().single()` after anon insert) is the specific behavior being validated.
- Test row will be left in place unless you want it deleted afterwards — say the word and I'll clean it up.
