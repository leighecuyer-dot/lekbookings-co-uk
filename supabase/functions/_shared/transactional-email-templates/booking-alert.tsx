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

interface BookingAlertProps {
  recipientName?: string
  businessName?: string
  customerName?: string
  customerPhone?: string
  serviceName?: string
  dateTime?: string
  staffName?: string
  reference?: string
  alertKind?: string
}

export function BookingAlertEmail({
  recipientName = 'there',
  businessName = 'your salon',
  customerName = 'A customer',
  customerPhone = '',
  serviceName = 'an appointment',
  dateTime = '',
  staffName = '',
  reference = '',
  alertKind = 'New booking',
}: BookingAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${alertKind}: ${serviceName} — ${businessName}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{alertKind}</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>Here are the details for {businessName}:</Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Customer:</strong> {customerName}
            </Text>
            {customerPhone ? (
              <Text style={row}>
                <strong>Phone:</strong> {customerPhone}
              </Text>
            ) : null}
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
          </Section>

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

const hr = { borderColor: '#ededed', margin: '24px 0 12px' }

const footer = { color: '#999999', fontSize: '12px', margin: 0, textAlign: 'center' as const }

export const template = {
  component: BookingAlertEmail,
  displayName: 'Booking alert (internal)',
  subject: (data: BookingAlertProps) =>
    `${data?.alertKind ?? 'New booking'}: ${data?.serviceName ?? 'appointment'}${
      data?.dateTime ? ` — ${data.dateTime}` : ''
    }`,
  previewData: {
    recipientName: 'Craig',
    businessName: 'Guild Hair',
    customerName: 'Sarah Jones',
    customerPhone: '+44 7700 900123',
    serviceName: 'Cut & Blow Dry',
    dateTime: 'Friday, 31 July at 2:00 pm',
    staffName: 'Helen',
    reference: 'A1B2C3D4',
    alertKind: 'New booking',
  },
} satisfies TemplateEntry
