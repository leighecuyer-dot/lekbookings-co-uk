import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { recordSend } from '../_shared/transactional-email-templates/log-send.ts'

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json(500, { error: 'Server configuration error' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Unauthorized' })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  const user = userData?.user
  if (userError || !user?.email) {
    return json(401, { error: 'Unauthorized' })
  }

  let businessId: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    businessId = typeof body?.businessId === 'string' ? body.businessId : null
  } catch {
    businessId = null
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let businessName = 'Your business'
  let businessPhone = ''
  if (businessId) {
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
    if ((roles ?? []).length > 0) {
      const { data: biz } = await admin
        .from('businesses')
        .select('name, phone')
        .eq('id', businessId)
        .maybeSingle()
      if (biz?.name) businessName = biz.name
      if (biz?.phone) businessPhone = biz.phone
    }
  }

  // The recipient is always the signed-in user's own address — this endpoint
  // can never be used to mail an arbitrary recipient.
  const recipient = user.email

  const dateTime = new Date().toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  try {
    const sent = await recordSend('booking-confirmation', recipient, () =>
      sendTemplateEmail('booking-confirmation', recipient, {
        idempotencyKey: `test-email-${user.id}-${Date.now()}`,
        templateData: {
          customerName: 'Test',
          businessName,
          serviceName: 'Test appointment',
          dateTime,
          reference: 'TESTMAIL',
          phone: businessPhone,
        },
      }),
    )

    if (!sent) {
      return json(200, { success: false, reason: 'recipient_suppressed', recipient })
    }
    return json(200, { success: true, recipient })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send test email'
    console.error('Test email failed', { message })
    return json(500, { error: message })
  }
})
