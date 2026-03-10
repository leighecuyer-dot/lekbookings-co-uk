// Textbelt SMS Provider
// Simple SMS API — no business registration required
// https://textbelt.com/

import type {
  SMSProvider,
  TransactionalSMSParams,
  MarketingSMSCampaignParams,
  SendResult,
  CampaignResult,
} from "../types.ts";
import {
  logMessage,
  canSendMarketing,
  incrementMarketingCounter,
  normalizePhone,
  SMS_OPT_OUT_FOOTER,
} from "../utils.ts";

const TEXTBELT_COST_PER_SMS = 0.10; // ~10p per SMS on paid key

export class TextbeltProvider implements SMSProvider {
  private apiKey: string;
  private baseUrl = "https://textbelt.com/text";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendTransactional(params: TransactionalSMSParams): Promise<SendResult> {
    try {
      const toNumber = normalizePhone(params.recipientPhone);

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: toNumber,
          message: params.message,
          key: this.apiKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "sms",
          message_type: "transactional",
          provider: "textbelt",
          provider_message_id: result.textId,
          status: "sent",
          recipient: toNumber,
          template_name: params.templateName,
          message_preview: params.message.substring(0, 200),
          cost_estimate: TEXTBELT_COST_PER_SMS,
        });

        return {
          success: true,
          messageId: result.textId,
          costEstimate: TEXTBELT_COST_PER_SMS,
        };
      } else {
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "sms",
          message_type: "transactional",
          provider: "textbelt",
          status: "failed",
          recipient: toNumber,
          message_preview: params.message.substring(0, 200),
          error_message: result.error || "Failed to send SMS",
        });

        return {
          success: false,
          error: result.error || "Failed to send SMS",
        };
      }
    } catch (error) {
      console.error("Textbelt SMS error:", error);
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

        // Personalise message and append opt-out footer
        let personalizedMessage = params.message.replace(/{name}/g, recipient.name);
        personalizedMessage += SMS_OPT_OUT_FOOTER;

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: toNumber,
            message: personalizedMessage,
            key: this.apiKey,
          }),
        });

        const apiResult = await response.json();

        if (apiResult.success) {
          result.sent++;
          await incrementMarketingCounter(recipient.customerId, params.businessId, "sms");

          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "sms",
            message_type: "marketing",
            provider: "textbelt",
            provider_message_id: apiResult.textId,
            status: "sent",
            recipient: toNumber,
            message_preview: personalizedMessage.substring(0, 200),
            cost_estimate: TEXTBELT_COST_PER_SMS,
            campaign_id: params.campaignId,
          });
        } else {
          result.failed++;
          result.errors.push({
            customerId: recipient.customerId,
            error: apiResult.error || "Send failed",
          });

          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "sms",
            message_type: "marketing",
            provider: "textbelt",
            status: "failed",
            recipient: toNumber,
            message_preview: personalizedMessage.substring(0, 200),
            error_message: apiResult.error,
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
}
