import type * as React from 'npm:react@18.3.1'

// deno-lint-ignore no-explicit-any
export type TemplateProps = Record<string, any>

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: React.ComponentType<any>
  subject: string | ((data: TemplateProps) => string)
  displayName?: string
  previewData?: TemplateProps
  to?: string
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingAlert } from './booking-alert.tsx'
import { template as teamInvite } from './team-invite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'booking-alert': bookingAlert,
  'team-invite': teamInvite,
}

