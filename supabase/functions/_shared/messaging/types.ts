// Messaging Infrastructure Types
// Provider-agnostic interfaces for transactional and marketing messaging

export type MessageChannel = 'email' | 'sms' | 'whatsapp';
export type MessageType = 'transactional' | 'marketing';
export type MessageProvider = 'brevo' | 'twilio' | 'textbelt' | 'resend';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'unsubscribed' | 'opened' | 'clicked';

export interface ContactPreferences {
  id: string;
  customer_id: string;
  business_id: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  transactional_email_enabled: boolean;
  transactional_sms_enabled: boolean;
  transactional_whatsapp_enabled: boolean;
  marketing_email_opt_in: boolean;
  marketing_sms_opt_in: boolean;
  marketing_whatsapp_opt_in: boolean;
  marketing_messages_this_week: number;
}

export interface MessageLogEntry {
  business_id: string;
  customer_id?: string;
  channel: MessageChannel;
  message_type: MessageType;
  provider: MessageProvider;
  provider_message_id?: string;
  status: MessageStatus;
  recipient: string;
  subject?: string;
  template_name?: string;
  message_preview?: string;
  cost_estimate?: number;
  error_message?: string;
  error_code?: string;
  campaign_id?: string;
}

// Transactional message interfaces
export interface TransactionalEmailParams {
  businessId: string;
  customerId: string;
  recipientEmail: string;
  recipientName: string;
  template: string;
  data: Record<string, unknown>;
  subject?: string;
}

export interface TransactionalSMSParams {
  businessId: string;
  customerId: string;
  recipientPhone: string;
  message: string;
  templateName?: string;
}

export interface TransactionalWhatsAppParams {
  businessId: string;
  customerId: string;
  recipientPhone: string;
  templateName: string;
  templateData: Record<string, string>;
}

// Marketing campaign interfaces
export interface MarketingEmailCampaignParams {
  businessId: string;
  campaignId?: string;
  recipients: Array<{
    customerId: string;
    email: string;
    name: string;
    data?: Record<string, unknown>;
  }>;
  subject: string;
  htmlContent: string;
  fromName: string;
}

export interface MarketingSMSCampaignParams {
  businessId: string;
  campaignId?: string;
  recipients: Array<{
    customerId: string;
    phone: string;
    name: string;
  }>;
  message: string;
}

export interface MarketingWhatsAppCampaignParams {
  businessId: string;
  campaignId?: string;
  recipients: Array<{
    customerId: string;
    phone: string;
    name: string;
    templateData?: Record<string, string>;
  }>;
  templateName: string;
}

// Provider response interfaces
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  costEstimate?: number;
}

export interface CampaignResult {
  totalRecipients: number;
  sent: number;
  failed: number;
  blocked: number; // Blocked due to opt-out or rate limit
  errors: Array<{
    customerId: string;
    error: string;
  }>;
}

// Provider interface - all providers must implement this
export interface EmailProvider {
  sendTransactional(params: TransactionalEmailParams): Promise<SendResult>;
  sendMarketing(params: MarketingEmailCampaignParams): Promise<CampaignResult>;
}

export interface SMSProvider {
  sendTransactional(params: TransactionalSMSParams): Promise<SendResult>;
  sendMarketing(params: MarketingSMSCampaignParams): Promise<CampaignResult>;
}

export interface WhatsAppProvider {
  sendTransactional(params: TransactionalWhatsAppParams): Promise<SendResult>;
  sendMarketing(params: MarketingWhatsAppCampaignParams): Promise<CampaignResult>;
}
