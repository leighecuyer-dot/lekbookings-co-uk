// Twilio SMS & WhatsApp Provider
// Used for transactional SMS, marketing SMS, and WhatsApp (phase 2)

import type {
  SMSProvider,
  WhatsAppProvider,
  TransactionalSMSParams,
  TransactionalWhatsAppParams,
  MarketingSMSCampaignParams,
  MarketingWhatsAppCampaignParams,
  SendResult,
  CampaignResult,
} from "../types.ts";
import {
  logMessage,
  canSendMarketing,
  incrementMarketingCounter,
  normalizePhone,
  SMS_OPT_OUT_FOOTER,
  COST_ESTIMATES,
} from "../utils.ts";

export class TwilioProvider implements SMSProvider, WhatsAppProvider {
  private accountSid: string;
  private authToken: string;
  private smsFromNumber: string;
  private whatsappFromNumber: string;
  private baseUrl: string;

  constructor(
    accountSid: string,
    authToken: string,
    smsFromNumber: string,
    whatsappFromNumber?: string
  ) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.smsFromNumber = smsFromNumber;
    this.whatsappFromNumber = whatsappFromNumber || `whatsapp:${smsFromNumber}`;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
  }

  // ============ SMS Methods ============

  async sendTransactional(params: TransactionalSMSParams): Promise<SendResult> {
    try {
      const toNumber = normalizePhone(params.recipientPhone);
      
      const response = await this.sendTwilioMessage(
        toNumber,
        this.smsFromNumber,
        params.message
      );

      const result = await response.json();

      if (response.ok) {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "sms",
          message_type: "transactional",
          provider: "twilio",
          provider_message_id: result.sid,
          status: "sent",
          recipient: toNumber,
          template_name: params.templateName,
          message_preview: params.message.substring(0, 200),
          cost_estimate: COST_ESTIMATES.twilio.sms_uk,
        });

        return {
          success: true,
          messageId: result.sid,
          costEstimate: COST_ESTIMATES.twilio.sms_uk,
        };
      } else {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "sms",
          message_type: "transactional",
          provider: "twilio",
          status: "failed",
          recipient: toNumber,
          message_preview: params.message.substring(0, 200),
          error_message: result.message,
          error_code: String(result.code),
        });

        return {
          success: false,
          error: result.message || "Failed to send SMS",
          errorCode: String(result.code),
        };
      }
    } catch (error) {
      console.error("Twilio SMS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendMarketing(params: MarketingSMSCampaignParams): Promise<CampaignResult> {
    const result: CampaignResult = {
      totalRecipients: params.recipients.length,
      sent: 0,
      failed: 0,
      blocked: 0,
      errors: [],
    };

    for (const recipient of params.recipients) {
      // Check opt-in and rate limit
      const canSend = await canSendMarketing(
        recipient.customerId,
        params.businessId,
        "sms"
      );

      if (!canSend.allowed) {
        result.blocked++;
        result.errors.push({
          customerId: recipient.customerId,
          error: canSend.reason || "Blocked",
        });
        continue;
      }

      try {
        const toNumber = normalizePhone(recipient.phone);
        
        // Personalize message
        let personalizedMessage = params.message
          .replace(/{name}/g, recipient.name);
        
        // ALWAYS append opt-out footer for marketing SMS
        personalizedMessage += SMS_OPT_OUT_FOOTER;

        const response = await this.sendTwilioMessage(
          toNumber,
          this.smsFromNumber,
          personalizedMessage
        );

        const apiResult = await response.json();

        if (response.ok) {
          result.sent++;
          await incrementMarketingCounter(recipient.customerId, params.businessId, "sms");
          
          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "sms",
            message_type: "marketing",
            provider: "twilio",
            provider_message_id: apiResult.sid,
            status: "sent",
            recipient: toNumber,
            message_preview: personalizedMessage.substring(0, 200),
            cost_estimate: COST_ESTIMATES.twilio.sms_uk,
            campaign_id: params.campaignId,
          });
        } else {
          result.failed++;
          result.errors.push({
            customerId: recipient.customerId,
            error: apiResult.message || "Send failed",
          });
          
          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "sms",
            message_type: "marketing",
            provider: "twilio",
            status: "failed",
            recipient: toNumber,
            message_preview: personalizedMessage.substring(0, 200),
            error_message: apiResult.message,
            error_code: String(apiResult.code),
            campaign_id: params.campaignId,
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          customerId: recipient.customerId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }

  // ============ WhatsApp Methods ============

  async sendTransactionalWhatsApp(params: TransactionalWhatsAppParams): Promise<SendResult> {
    try {
      const toNumber = `whatsapp:${normalizePhone(params.recipientPhone)}`;
      
      // WhatsApp requires approved templates
      // For now, we'll use the template name and data
      // In production, this would use Twilio's content API
      const message = this.buildWhatsAppTemplateMessage(
        params.templateName,
        params.templateData
      );

      const response = await this.sendTwilioMessage(
        toNumber,
        this.whatsappFromNumber,
        message
      );

      const result = await response.json();

      if (response.ok) {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "whatsapp",
          message_type: "transactional",
          provider: "twilio",
          provider_message_id: result.sid,
          status: "sent",
          recipient: toNumber,
          template_name: params.templateName,
          cost_estimate: COST_ESTIMATES.twilio.whatsapp_template,
        });

        return {
          success: true,
          messageId: result.sid,
          costEstimate: COST_ESTIMATES.twilio.whatsapp_template,
        };
      } else {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "whatsapp",
          message_type: "transactional",
          provider: "twilio",
          status: "failed",
          recipient: toNumber,
          template_name: params.templateName,
          error_message: result.message,
          error_code: String(result.code),
        });

        return {
          success: false,
          error: result.message || "Failed to send WhatsApp",
          errorCode: String(result.code),
        };
      }
    } catch (error) {
      console.error("Twilio WhatsApp error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendMarketingWhatsApp(params: MarketingWhatsAppCampaignParams): Promise<CampaignResult> {
    const result: CampaignResult = {
      totalRecipients: params.recipients.length,
      sent: 0,
      failed: 0,
      blocked: 0,
      errors: [],
    };

    for (const recipient of params.recipients) {
      // Check opt-in and rate limit
      const canSend = await canSendMarketing(
        recipient.customerId,
        params.businessId,
        "whatsapp"
      );

      if (!canSend.allowed) {
        result.blocked++;
        result.errors.push({
          customerId: recipient.customerId,
          error: canSend.reason || "Blocked",
        });
        continue;
      }

      try {
        const toNumber = `whatsapp:${normalizePhone(recipient.phone)}`;
        
        const message = this.buildWhatsAppTemplateMessage(
          params.templateName,
          { name: recipient.name, ...recipient.templateData }
        );

        const response = await this.sendTwilioMessage(
          toNumber,
          this.whatsappFromNumber,
          message
        );

        const apiResult = await response.json();

        if (response.ok) {
          result.sent++;
          await incrementMarketingCounter(recipient.customerId, params.businessId, "whatsapp");
          
          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "whatsapp",
            message_type: "marketing",
            provider: "twilio",
            provider_message_id: apiResult.sid,
            status: "sent",
            recipient: toNumber,
            template_name: params.templateName,
            cost_estimate: COST_ESTIMATES.twilio.whatsapp_template,
            campaign_id: params.campaignId,
          });
        } else {
          result.failed++;
          result.errors.push({
            customerId: recipient.customerId,
            error: apiResult.message || "Send failed",
          });
          
          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "whatsapp",
            message_type: "marketing",
            provider: "twilio",
            status: "failed",
            recipient: toNumber,
            template_name: params.templateName,
            error_message: apiResult.message,
            error_code: String(apiResult.code),
            campaign_id: params.campaignId,
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          customerId: recipient.customerId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }

  // ============ Helper Methods ============

  private async sendTwilioMessage(
    to: string,
    from: string,
    body: string
  ): Promise<Response> {
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", from);
    formData.append("Body", body);

    return fetch(`${this.baseUrl}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  private buildWhatsAppTemplateMessage(
    templateName: string,
    data: Record<string, string>
  ): string {
    // Map template names to message formats
    // In production, these would be registered WhatsApp templates
    const templates: Record<string, (d: Record<string, string>) => string> = {
      booking_confirmation: (d) =>
        `✅ Hi ${d.name}! Your booking for ${d.service} on ${d.dateTime} is confirmed. See you then!`,
      booking_reminder: (d) =>
        `📅 Reminder: You have an appointment for ${d.service} on ${d.dateTime}. Reply YES to confirm or NO to cancel.`,
      booking_cancelled: (d) =>
        `❌ Your booking for ${d.service} on ${d.dateTime} has been cancelled. We hope to see you again soon!`,
      slow_day_offer: (d) =>
        `🌟 Hi ${d.name}! We have availability today. Book now and get ${d.discount}% off! ${d.bookingLink}`,
    };

    const templateFn = templates[templateName];
    if (templateFn) {
      return templateFn(data);
    }

    // Fallback
    return `Hi ${data.name || "there"}, you have a message from your booking provider.`;
  }
}
