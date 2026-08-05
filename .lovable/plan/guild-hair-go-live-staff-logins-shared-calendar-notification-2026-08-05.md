# Guild Hair go-live: staff logins, shared calendar, notifications

## Current state (verified)

- Guild Hair has 3 staff records (Craig, Helen, Charlotte) — none are linked to a login account and none have an email.
- No staff member is assigned to any service, so the public booking page can't filter "who does what".
- Only two owner accounts exist; no staff-role logins yet.
- SMS is switched on (confirmations, reminders, status changes, sender "Guild Hair"), and the hourly reminder job is running.
- Blocker: the Twilio sender number currently configured is not SMS-capable, so every SMS fails at the provider. This is a Twilio account setting, not app code.

## What gets built

### 1. Staff logins linked to their own diary

- Owner invites each employee by email from the Staff page; the invite creates a staff-role login.
- When they accept, their login is automatically linked to their staff record, so bookings assigned to them are recognised as "theirs".
- Owner can also link an existing login to a staff record manually if someone signs up first.

### 2. Shared calendar with owner-controlled visibility

New per-employee setting on the owner's Team Permissions screen, with three calendar modes:

- Everyone's appointments (shared salon view, colour-coded per person)
- Everyone's appointments, but their own highlighted and others shown as "Busy" with no customer details
- Only their own appointments

Plus a separate per-employee edit control:

- Can edit any appointment
- Can edit only their own appointments
- View only

These are enforced both in the interface and in the database access rules, so a staff member cannot bypass them.

### 3. Service assignment

Owner assigns which services each of Craig, Helen and Charlotte performs, so the customer booking page shows the right people and only their genuinely free times.

### 4. Notifications

- Customer: SMS + email on confirmation, reminder and changes (already wired).
- Owner alert: email on every new booking, with a settings panel where the owner chooses which alerts he receives (new booking, cancellation, reschedule, daily summary) and whether they go by email, SMS, or both.
- Staff alert: the staff member the booking is assigned to gets an email/SMS for new bookings and cancellations on their diary; owner can switch this on or off per employee.

### 5. Twilio SMS fix (needs you)

In Twilio: Phone Numbers → Active Numbers → open the sender → confirm it has SMS capability. Save an SMS-capable number as `TWILIO_SMS_FROM`, or a Messaging Service SID as `TWILIO_MESSAGING_SERVICE_SID`. Until this is done, all SMS will keep failing regardless of app settings. UK numbers may also need a registered sender/regulatory bundle.

## Technical notes

- Extend `user_permissions` with `calendar_scope` ('all' | 'all_masked' | 'own') and `booking_edit_scope` ('all' | 'own' | 'none'); surface both in `TeamPermissionsSection`.
- Add `staff.user_id` linking on invite acceptance (extend the invite handling function) plus a manual link control on the Staff page.
- Booking queries in Calendar/Week/Kanban filter by the caller's staff id when scope is 'own'; masked mode strips customer fields client-side and via a security-definer read path.
- Update `bookings` row-level rules so staff writes are restricted to their own `staff_id` when edit scope is 'own'.
- New `notification_preferences` per business (owner channels/events) and per staff toggle; owner/staff alerts fire from the existing `send-booking-confirmation` and `send-sms` functions.
- Populate `staff_services` via the existing Staff page UI.

## Test checklist before opening tomorrow

1. Fix the Twilio sender, then Settings → SMS → Send test SMS.
2. Settings → Email → Send test.
3. Invite one employee, accept the invite, confirm their calendar scope behaves as set.
4. Make a real booking from the public page with a staff member selected; confirm customer SMS + email, owner alert and staff alert all arrive, and the booking appears on the shared calendar.
