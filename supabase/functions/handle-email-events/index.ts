import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Stored strings are constrained by live CHECK constraints — never rename them.
type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe'
type LogStatus = 'bounced' | 'complained' | 'suppressed'

const LOG_MESSAGES: Record<SuppressionReason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(
  eventId: string,
  recipient: string | undefined,
  reason: SuppressionReason,
  status: LogStatus,
) {
  if (!recipient) {
    console.error('Email event without recipient', { event_id: eventId })
    return
  }
  const email = recipient.toLowerCase()

  const { error: suppressError } = await admin
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      event_id: eventId,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: logError } = await admin.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: email,
    status,
    error_message: LOG_MESSAGES[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Failed to insert email_send_log', {
      event_id: eventId,
      code: logError.code,
      message: logError.message,
    })
    throw new Error('Failed to record email event')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record(event.event_id, event.data?.recipient, 'bounce', 'bounced')
    },
    'email.complaint': async (event) => {
      await record(event.event_id, event.data?.recipient, 'complaint', 'complained')
    },
    'email.unsubscribed': async (event) => {
      await record(event.event_id, event.data?.recipient, 'unsubscribe', 'suppressed')
    },
  },
})

Deno.serve((req) => handler(req))
