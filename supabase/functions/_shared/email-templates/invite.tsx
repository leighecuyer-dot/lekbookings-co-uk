/// <reference types="npm:@types/react@18.3.1" />

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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to LEK — your booking system is ready to set up</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>LEK</Text>
        </Section>
        <Hr style={divider} />

        <Heading style={h1}>Welcome aboard! 🎉</Heading>
        <Text style={text}>
          Your booking system is set up and ready for you. Click below to create
          your account and take control of your dashboard — manage bookings,
          staff, and customers all in one place.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation & Get Started
          </Button>
        </Section>

        <Hr style={divider} />

        <Heading style={h2}>Here's what to do once you're in</Heading>

        <Section style={stepRow}>
          <Text style={stepNumber}>1</Text>
          <Section>
            <Text style={stepTitle}>Set your working hours</Text>
            <Text style={stepDesc}>
              Go to <strong>Staff</strong> and set the opening hours for each
              team member so customers can only book when you're available.
            </Text>
          </Section>
        </Section>

        <Section style={stepRow}>
          <Text style={stepNumber}>2</Text>
          <Section>
            <Text style={stepTitle}>Add your WhatsApp number</Text>
            <Text style={stepDesc}>
              Head to <strong>Settings → Social Media & Messaging</strong> and
              add your WhatsApp number (e.g. +447700123456). This adds a "Chat
              with us" button to your booking page so customers can message you
              directly.
            </Text>
          </Section>
        </Section>

        <Section style={stepRow}>
          <Text style={stepNumber}>3</Text>
          <Section>
            <Text style={stepTitle}>Customise your booking page</Text>
            <Text style={stepDesc}>
              Upload your logo, set your brand colours, and add gallery photos
              of your work in <strong>Settings → Theme & Branding</strong>. Your
              customers will see this when they book online.
            </Text>
          </Section>
        </Section>

        <Section style={stepRow}>
          <Text style={stepNumber}>4</Text>
          <Section>
            <Text style={stepTitle}>Invite your team</Text>
            <Text style={stepDesc}>
              Add your staff members in the <strong>Staff</strong> section. Each
              person gets their own login so they can see their own bookings and
              schedule.
            </Text>
          </Section>
        </Section>

        <Section style={stepRow}>
          <Text style={stepNumber}>5</Text>
          <Section>
            <Text style={stepTitle}>Share your booking link</Text>
            <Text style={stepDesc}>
              Your booking page is live! Share the link on your Instagram bio,
              Facebook page, and with your customers. You'll find the link in
              <strong> Settings → Booking Page</strong>.
            </Text>
          </Section>
        </Section>

        <Hr style={divider} />

        <Section style={tipBox}>
          <Text style={tipTitle}>💡 Quick tip: WhatsApp setup</Text>
          <Text style={tipText}>
            Most salons find WhatsApp is the easiest way for customers to get in
            touch. Just add your number in Settings and the button appears
            automatically on your booking page — no extra apps or setup needed.
          </Text>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Need help? Just reply to this email and we'll sort you out.
        </Text>
        <Text style={footer}>
          <Link href={siteUrl} style={footerLink}>
            lekbookings.co.uk
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Space Grotesk', 'Inter', Arial, sans-serif",
}
const container = {
  padding: '40px 32px',
  maxWidth: '520px',
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
const h2 = {
  fontSize: '17px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  letterSpacing: '-0.01em',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#737373',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500' as const,
  borderRadius: '8px',
  padding: '12px 28px',
  textDecoration: 'none',
}
const stepRow = {
  marginBottom: '20px',
}
const stepNumber = {
  display: 'inline-block' as const,
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  textAlign: 'center' as const,
  borderRadius: '50%',
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0 0 8px 0',
}
const stepTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  margin: '0 0 4px',
}
const stepDesc = {
  fontSize: '13px',
  color: '#737373',
  lineHeight: '1.5',
  margin: '0',
}
const tipBox = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '16px 20px',
}
const tipTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  margin: '0 0 6px',
}
const tipText = {
  fontSize: '13px',
  color: '#525252',
  lineHeight: '1.5',
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#a3a3a3',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const footerLink = {
  color: '#a3a3a3',
  textDecoration: 'underline',
}
