/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for LEK Booking System</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>LEK</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Section style={codeContainer}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif",
}
const container = {
  padding: '40px 32px',
  maxWidth: '480px',
  margin: '0 auto',
}
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  letterSpacing: '-0.02em',
  margin: '0',
}
const divider = { borderColor: '#e5e5e5', margin: '24px 0' }
const h1 = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  letterSpacing: '-0.02em',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#737373',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeContainer = {
  textAlign: 'center' as const,
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: "'Space Grotesk', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  letterSpacing: '0.15em',
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#a3a3a3',
  margin: '0',
  textAlign: 'center' as const,
}
