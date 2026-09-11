import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Appends a row to public.email_send_log.
 *
 * Status strings are constrained by a live CHECK constraint:
 * 'pending' | 'sent' | 'suppressed' | 'failed' | 'bounced' | 'complained' | 'dlq'.
 * Never pass anything else — the insert is silently rejected.
 */
export async function logEmailSend(entry: {
  templateName: string
  recipientEmail: string
  status: 'sent' | 'suppressed' | 'failed'
  errorMessage?: string | null
}): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('email_send_log skipped: missing Supabase environment variables')
    return
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await admin.from('email_send_log').insert({
    message_id: null,
    template_name: entry.templateName,
    recipient_email: entry.recipientEmail,
    status: entry.status,
    error_message: entry.errorMessage ? entry.errorMessage.slice(0, 1000) : null,
  })

  if (error) {
    // A log row never decides the send result.
    console.error('Failed to write email_send_log', { code: error.code, message: error.message })
  }
}

/** Sends through the managed helper and records the outcome in email_send_log. */
export async function recordSend(
  templateName: string,
  recipientEmail: string,
  send: () => Promise<{ sent: boolean; reason?: string }>
): Promise<boolean> {
  try {
    const result = await send()
    if (result.sent) {
      await logEmailSend({ templateName, recipientEmail, status: 'sent' })
      return true
    }
    await logEmailSend({
      templateName,
      recipientEmail,
      status: 'suppressed',
      errorMessage: result.reason ?? 'recipient_suppressed',
    })
    return false
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logEmailSend({ templateName, recipientEmail, status: 'failed', errorMessage: message })
    throw error
  }
}
