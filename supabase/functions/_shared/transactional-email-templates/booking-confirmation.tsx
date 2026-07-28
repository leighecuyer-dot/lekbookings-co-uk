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
import type { TemplateEntry } from './registry.ts'

interface BookingConfirmationProps {
  customerName?: string
  businessName?: string
  serviceName?: string
  dateTime?: string
  reference?: string
  staffName?: string
  address?: string
  phone?: string
}

export function BookingConfirmationEmail({
  customerName = 'there',
  businessName = 'the salon',
  serviceName = 'your appointment',
  dateTime = '',
  reference = '',
  staffName = '',
  address = '',
  phone = '',
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your ${serviceName} at ${businessName} is confirmed`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Booking confirmed</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your appointment at {businessName} is booked. Here are the details:
          </Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Service:</strong> {serviceName}
            </Text>
            {dateTime ? (
              <Text style={row}>
                <strong>When:</strong> {dateTime}
              </Text>
            ) : null}
            {staffName ? (
              <Text style={row}>
                <strong>With:</strong> {staffName}
              </Text>
            ) : null}
            {reference ? (
              <Text style={row}>
                <strong>Reference:</strong> {reference}
              </Text>
            ) : null}
            {address ? (
              <Text style={row}>
                <strong>Where:</strong> {address}
              </Text>
            ) : null}
          </Section>

          <Text style={muted}>
            Need to change or cancel? {phone ? `Call us on ${phone}.` : 'Just get in touch.'}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>{businessName}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '24px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px',
}

const heading = {
  color: '#0a0a0a',
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 16px',
}

const text = { color: '#333333', fontSize: '15px', lineHeight: '24px', margin: '0 0 12px' }

const card = {
  backgroundColor: '#fafafa',
  border: '1px solid #ededed',
  borderRadius: '8px',
  margin: '16px 0',
  padding: '16px',
}

const row = { color: '#0a0a0a', fontSize: '15px', lineHeight: '22px', margin: '0 0 6px' }

const muted = { color: '#666666', fontSize: '13px', lineHeight: '20px', margin: '12px 0 0' }

const hr = { borderColor: '#ededed', margin: '24px 0 12px' }

const footer = { color: '#999999', fontSize: '12px', margin: 0, textAlign: 'center' as const }

export const template = {
  component: BookingConfirmationEmail,
  displayName: 'Booking confirmation',
  subject: (data: BookingConfirmationProps) =>
    `Booking confirmed: ${data?.serviceName ?? 'your appointment'}${
      data?.businessName ? ` at ${data.businessName}` : ''
    }`,
  previewData: {
    customerName: 'Sarah',
    businessName: 'Guild Hair',
    serviceName: 'Cut & Blow Dry',
    dateTime: 'Friday, 31 July at 2:00 pm',
    reference: 'A1B2C3D4',
    staffName: 'Helen',
    phone: '+44 7928 455886',
  },
} satisfies TemplateEntry
