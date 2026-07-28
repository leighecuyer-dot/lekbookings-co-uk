## What I checked in your live data

Guild Hair (`/book/the-guild-hair-f1yk0u`) is real and mostly ready:

- 16 active services, 3 staff (Craig, Helen, Charlotte) all with working hours set
- 11 customers, 9 bookings already in the system, booking page theme configured
- Business email `craigandhelen@guildhair.co.uk`, phone `+44 7928 455886`
- Email sending domain `notify.lekbookings.co.uk` is verified and live
- Twilio SMS/WhatsApp credentials are all stored

Four things will trip you up today if we don't fix them first:

1. **Timezone is set to UTC.** It's British Summer Time, so every appointment time can display an hour out. Needs to be London.
2. **SMS is switched off.** There is no SMS settings record for Guild Hair, so no confirmation text will ever send. It has never sent one (SMS log is empty).
3. **No message has ever actually been sent** from this business — email or SMS. So today is the first real send; it needs a controlled test before a real customer sees it.
4. **A duplicate leftover business exists** named "Tes 2" with a near-identical Guild Hair booking link. Easy to demo the wrong page by accident.

Also: staff records have no email or phone, so Craig/Helen/Charlotte can't log in as themselves yet. Fine if today is owner-only, worth knowing.

## Plan

### Step 1 — Fix the settings that will break the test
- Set Guild Hair's timezone to London so times show correctly.
- Create the SMS settings for Guild Hair with SMS on, booking confirmations on, reminders on, and the sender name set to "Guild Hair".
- Make sure email booking confirmations are explicitly on.
- Rename or clear the duplicate "Tes 2" business so there's no chance of demoing the wrong link.

### Step 2 — Add a one-tap "Send test message" button
On the Settings page, next to the SMS section, add a button that sends a test SMS to a number you type in, and a matching one for a test email. This means you can prove the numbers and notices work in the salon, in front of Craig and Helen, without creating a fake booking.

### Step 3 — Run the full test with you before you leave
I'll run it end to end here first and report what happens:
- Book as a customer through the public page with your own mobile and email
- Confirm the booking appears in the calendar and Kanban at the right time
- Confirm the SMS lands, with correct wording and salon name
- Confirm the email lands and isn't in spam
- Change the booking status as owner and confirm the update notice sends

### Step 4 — Your on-site checklist
I'll write you a short printed-style checklist page you can follow at the salon, step by step, in order.

## Technical notes
- Timezone/SMS settings are data changes (`businesses.timezone`, new `business_sms_settings` row), not code.
- Test-send buttons call the existing `send-sms` and booking-confirmation functions with a `test` event type, logged to `sms_log` so we can see delivery status and any Twilio error code.
- UK numbers get normalised to +44 E.164 before sending, and STOP/opt-out rules still apply.
