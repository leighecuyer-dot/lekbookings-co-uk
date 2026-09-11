import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface TeamInviteProps {
  recipientName?: string
  businessName?: string
  roleLabel?: string
  inviteUrl?: string
  inviteEmail?: string
}

export function TeamInviteEmail({
  recipientName = 'there',
  businessName = 'the team',
  roleLabel = 'Staff',
  inviteUrl = 'https://lekbookings.co.uk',
  inviteEmail = '',
}: TeamInviteProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your login for ${businessName} is ready`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been added to {businessName}</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>
            You've been given <strong>{roleLabel}</strong> access to the {businessName} booking
            system. Tap the button below to set up your login and see your appointments.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Accept invitation
            </Button>
          </Section>

          {inviteEmail ? (
            <Text style={note}>
              Please sign up using <strong>{inviteEmail}</strong> — the invitation only works with
              this address.
            </Text>
          ) : null}

          <Text style={note}>This invitation expires in 14 days.</Text>

          <Hr style={divider} />
          <Text style={footer}>
            If the button doesn't work, copy this link into your browser:
          </Text>
          <Text style={footer}>
            <Link href={inviteUrl} style={footerLink}>
              {inviteUrl}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif",
}
const container = { padding: '40px 32px', maxWidth: '520px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 600 as const,
  color: '#0a0a0a',
  letterSpacing: '-0.02em',
  margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const note = { fontSize: '13px', color: '#737373', lineHeight: '1.6', margin: '0 0 10px' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500 as const,
  borderRadius: '8px',
  padding: '12px 28px',
  textDecoration: 'none',
}
const divider = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 6px', wordBreak: 'break-all' as const }
const footerLink = { color: '#0a0a0a', textDecoration: 'underline' }

export const template = {
  component: TeamInviteEmail,
  displayName: 'Team invitation',
  subject: (data: TeamInviteProps) =>
    `Your login for ${data?.businessName ?? 'your salon'} is ready`,
  previewData: {
    recipientName: 'Helen',
    businessName: 'Guild Hair',
    roleLabel: 'Staff',
    inviteUrl: 'https://lekbookings.co.uk/invite/accept?token=abc123',
    inviteEmail: 'helen@example.com',
  },
} satisfies TemplateEntry
