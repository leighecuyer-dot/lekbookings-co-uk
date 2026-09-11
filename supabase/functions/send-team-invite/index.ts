import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { recordSend } from '../_shared/transactional-email-templates/log-send.ts'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
  readonly: 'View only',
}

const INVITE_BASE = 'https://lekbookings.co.uk'

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
  if (userError || !userData?.user) {
    return json(401, { error: 'Unauthorized' })
  }

  let token: string
  try {
    const body = await req.json()
    token = typeof body?.token === 'string' ? body.token.trim() : ''
  } catch {
    return json(400, { error: 'Invalid JSON in request body' })
  }
  if (!token || token.length > 200) {
    return json(400, { error: 'A valid invite token is required' })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Everything in the email comes from the stored invite row, never the caller.
  const { data: invite, error: inviteError } = await admin
    .from('business_invites')
    .select('id, email, role, business_id, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return json(404, { error: 'Invite not found' })
  }
  if (invite.accepted_at) {
    return json(400, { error: 'This invite has already been accepted' })
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return json(400, { error: 'This invite has expired' })
  }

  // Only an owner or admin of that business may trigger the email.
  const { data: callerRoles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('business_id', invite.business_id)

  const allowed = (callerRoles ?? []).some((r) => r.role === 'owner' || r.role === 'admin')
  if (!allowed) {
    return json(403, { error: 'Forbidden' })
  }

  const { data: business } = await admin
    .from('businesses')
    .select('name')
    .eq('id', invite.business_id)
    .maybeSingle()

  try {
    const sent = await recordSend('team-invite', invite.email, () =>
      sendTemplateEmail('team-invite', invite.email, {
        idempotencyKey: `team-invite-${token}`,
        templateData: {
          recipientName: invite.email.split('@')[0],
          businessName: business?.name || 'your team',
          roleLabel: ROLE_LABELS[invite.role as string] ?? 'Staff',
          inviteUrl: `${INVITE_BASE}/invite/accept?token=${token}`,
          inviteEmail: invite.email,
        },
      }),
    )

    if (!sent) {
      return json(200, { success: false, reason: 'recipient_suppressed' })
    }
    return json(200, { success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send invite email'
    console.error('Invite email failed', { message })
    return json(500, { error: 'Failed to send invite email' })
  }
})
