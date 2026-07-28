## Plan

1. **Make GBP the only currency shown in the app**
   - Keep all service, booking, revenue, dashboard, pricing, and onboarding displays using **£ / GBP**.
   - Remove the multi-currency choices from the AI price-list import so imported services default to GBP.
   - Keep price storage as whole GBP values, matching the existing project rule.

2. **Make shared booking links show the company booking-page logo**
   - Update the booking page metadata in the browser to use the current business name and logo.
   - Add a proper share-preview route/function that returns social preview tags using the business booking logo, then redirects visitors to the booking page.
   - Update the booking-link copy/share button in Settings so the shared link uses that preview route, which is what WhatsApp/Facebook/iMessage need to show the right picture.
   - If a company has no booking-page logo, fall back to the business logo, then the LEK default image.

3. **Let customers choose the right staff member when booking**
   - Change the public booking modal flow to: **service → date → staff → time → details**.
   - Only show staff who:
     - are active,
     - are assigned to that service where service assignments exist,
     - are working that day,
     - are not on leave,
     - and have at least one free slot for the selected service length.
   - After the customer picks a staff member, show only that staff member’s available times.
   - If nobody is available for that date, show a clear “choose another date” message instead of letting the customer pick an invalid slot.

4. **Fix the SMS failure path and add Twilio instructions**
   - The latest backend log confirms the customer number is now formatted correctly; the current failure is the configured Twilio **From** number: `+441156478559` is **not SMS-capable**.
   - Keep the code change that supports either:
     - `TWILIO_SMS_FROM` = an SMS-capable Twilio number, or
     - `TWILIO_MESSAGING_SERVICE_SID` = a Twilio Messaging Service.
   - Add clearer on-screen SMS test errors so it says exactly when the sender number is the issue.
   - Provide a simple Twilio checklist:
     1. In Twilio, go to **Phone Numbers → Manage → Active numbers**.
     2. Open the number you want to use.
     3. Confirm it has **SMS** capability, not only Voice.
     4. If it does not, buy/use a Twilio number with SMS enabled.
     5. Save that SMS-capable number as `TWILIO_SMS_FROM` in Lovable’s secure secrets form.
     6. Re-test **Settings → SMS notifications → Send test SMS**.
   - Recommend enabling Twilio **SMS Pumping Protection** and reviewing **Geo Permissions** before real customer traffic.

5. **Verify after implementation**
   - Check the latest SMS log after a test send.
   - Check a public booking page flow where a service has multiple staff.
   - Confirm copied booking links use the new share-preview URL.
   - Confirm remaining visible currency labels are GBP/£.