

# Getting Email, SMS and WhatsApp Messaging Working

Your messaging system is already fully coded and ready to go -- it just needs the provider accounts and API keys connecting. Here's what needs doing:

---

## What's Already Built

- Booking confirmation emails (via Resend -- already configured)
- Bulk email campaigns (via Brevo)
- SMS sending and campaigns (via Twilio)
- WhatsApp messages and campaigns (via Twilio)
- Opt-in/opt-out compliance, rate limiting, message logging
- Bulk message dialog with templates

## What's Missing

Three provider accounts need setting up and their API keys added as secrets.

---

## Step 1: Brevo (for bulk/marketing emails)

Brevo (formerly Sendinblue) handles marketing email campaigns.

1. Sign up free at **brevo.com** (300 emails/day on free tier)
2. Go to **SMTP & API** in your Brevo dashboard
3. Generate an API key
4. Add the key as a secret called `BREVO_API_KEY`

## Step 2: Twilio (for SMS and WhatsApp)

Twilio handles both SMS and WhatsApp messaging.

1. Sign up at **twilio.com** (free trial includes credit)
2. From the Twilio Console, get your:
   - **Account SID**
   - **Auth Token**
   - **Phone Number** (buy one from Twilio for SMS)
3. For WhatsApp: activate the **Twilio Sandbox for WhatsApp** in the console (or apply for a WhatsApp Business number)
4. Add these as secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (e.g. +441234567890)
   - `TWILIO_WHATSAPP_FROM` (e.g. whatsapp:+14155238886 for sandbox)

## Step 3: Twilio Webhook URL

Your app already has a webhook endpoint for handling incoming SMS replies (e.g. "STOP", "confirm", "cancel"). After adding your Twilio credentials, configure Twilio to send incoming messages to your webhook:

- **SMS webhook URL**: `https://oleozgrhqfxavbmsiecf.supabase.co/functions/v1/twilio-webhook`
- Set this in Twilio Console under your phone number's **Messaging Configuration**

## Step 4: Verify Everything Works

Once secrets are added, test each channel:
- Booking confirmation email (already working via Resend)
- Bulk email campaign via the dashboard
- SMS campaign via the dashboard
- WhatsApp message via the dashboard

---

## Technical Notes

- **No code changes needed** -- the edge functions (`send-message`, `twilio-webhook`, `send-booking-confirmation`) are already deployed and will pick up the secrets automatically
- The Brevo free tier (300 emails/day) is plenty for starting out
- Twilio trial accounts can only send to verified numbers -- upgrade when ready for production
- WhatsApp requires either the Twilio Sandbox (for testing) or an approved WhatsApp Business number (for production)
- All messaging costs are included in your subscription tiers as per your pricing model

