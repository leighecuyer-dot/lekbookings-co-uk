// Messaging Abstraction Layer
// Provider-agnostic messaging service with automatic provider selection

import { BrevoEmailProvider } from "./providers/brevo.ts";
import { TextbeltProvider } from "./providers/textbelt.ts";
import type {
  TransactionalEmailParams,
  TransactionalSMSParams,
  TransactionalWhatsAppParams,
  MarketingEmailCampaignParams,
  MarketingSMSCampaignParams,
  MarketingWhatsAppCampaignParams,
  SendResult,
  CampaignResult,
} from "./types.ts";
import { canSendTransactional, canSendMarketing } from "./utils.ts";

// ============ Provider Factory ============

function getEmailProvider(): BrevoEmailProvider | null {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) {
    console.warn("BREVO_API_KEY not configured");
    return null;
  }
  return new BrevoEmailProvider(apiKey);
}

function getSMSProvider(): TwilioProvider | null {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const phoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  const whatsappNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !phoneNumber) {
    console.warn("Twilio credentials not configured");
    return null;
  }

  return new TwilioProvider(accountSid, authToken, phoneNumber, whatsappNumber);
}

// ============ Transactional Messaging ============

export async function sendTransactionalEmail(
  params: TransactionalEmailParams
): Promise<SendResult> {
  // Check if customer allows transactional email
  const canSend = await canSendTransactional(
    params.customerId,
    params.businessId,
    "email"
  );

  if (!canSend.allowed) {
    return {
      success: false,
      error: canSend.reason || "Cannot send transactional email",
    };
  }

  const provider = getEmailProvider();
  if (!provider) {
    return {
      success: false,
      error: "Email provider not configured. Please add BREVO_API_KEY.",
    };
  }

  return provider.sendTransactional(params);
}

export async function sendTransactionalSMS(
  params: TransactionalSMSParams
): Promise<SendResult> {
  // Check if customer allows transactional SMS
  const canSend = await canSendTransactional(
    params.customerId,
    params.businessId,
    "sms"
  );

  if (!canSend.allowed) {
    return {
      success: false,
      error: canSend.reason || "Cannot send transactional SMS",
    };
  }

  const provider = getSMSProvider();
  if (!provider) {
    return {
      success: false,
      error: "SMS provider not configured. Please add Twilio credentials.",
    };
  }

  return provider.sendTransactional(params);
}

export async function sendTransactionalWhatsApp(
  params: TransactionalWhatsAppParams
): Promise<SendResult> {
  // Check if customer allows transactional WhatsApp
  const canSend = await canSendTransactional(
    params.customerId,
    params.businessId,
    "whatsapp"
  );

  if (!canSend.allowed) {
    return {
      success: false,
      error: canSend.reason || "Cannot send transactional WhatsApp",
    };
  }

  const provider = getSMSProvider();
  if (!provider) {
    return {
      success: false,
      error: "WhatsApp provider not configured. Please add Twilio credentials.",
    };
  }

  return provider.sendTransactionalWhatsApp(params);
}

// ============ Marketing Campaigns ============

export async function sendMarketingEmailCampaign(
  params: MarketingEmailCampaignParams
): Promise<CampaignResult> {
  const provider = getEmailProvider();
  if (!provider) {
    return {
      totalRecipients: params.recipients.length,
      sent: 0,
      failed: params.recipients.length,
      blocked: 0,
      errors: [{ customerId: "all", error: "Email provider not configured" }],
    };
  }

  // Provider handles opt-in checks per recipient
  return provider.sendMarketing(params);
}

export async function sendMarketingSMSCampaign(
  params: MarketingSMSCampaignParams
): Promise<CampaignResult> {
  const provider = getSMSProvider();
  if (!provider) {
    return {
      totalRecipients: params.recipients.length,
      sent: 0,
      failed: params.recipients.length,
      blocked: 0,
      errors: [{ customerId: "all", error: "SMS provider not configured" }],
    };
  }

  // Provider handles opt-in checks and rate limiting per recipient
  return provider.sendMarketing(params);
}

export async function sendMarketingWhatsAppCampaign(
  params: MarketingWhatsAppCampaignParams
): Promise<CampaignResult> {
  const provider = getSMSProvider();
  if (!provider) {
    return {
      totalRecipients: params.recipients.length,
      sent: 0,
      failed: params.recipients.length,
      blocked: 0,
      errors: [{ customerId: "all", error: "WhatsApp provider not configured" }],
    };
  }

  // Provider handles opt-in checks and rate limiting per recipient
  return provider.sendMarketingWhatsApp(params);
}

// ============ Re-exports ============

export * from "./types.ts";
export * from "./utils.ts";
