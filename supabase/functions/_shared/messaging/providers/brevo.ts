// Brevo (formerly Sendinblue) Email Provider
// Used for both transactional and marketing emails

import type {
  EmailProvider,
  TransactionalEmailParams,
  MarketingEmailCampaignParams,
  SendResult,
  CampaignResult,
} from "../types.ts";
import {
  logMessage,
  canSendMarketing,
  incrementMarketingCounter,
  COST_ESTIMATES,
} from "../utils.ts";

export class BrevoEmailProvider implements EmailProvider {
  private apiKey: string;
  private baseUrl = "https://api.brevo.com/v3";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendTransactional(params: TransactionalEmailParams): Promise<SendResult> {
    try {
      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: params.data.businessName || "Booking",
            email: "noreply@booking.lovable.app", // Use verified Brevo sender
          },
          to: [
            {
              email: params.recipientEmail,
              name: params.recipientName,
            },
          ],
          subject: params.subject || `Update from ${params.data.businessName}`,
          htmlContent: this.buildTransactionalHtml(params.template, params.data),
          tags: ["transactional", params.template],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Brevo transactional email failed:", result);
        
        await logMessage({
          business_id: params.businessId,
          customer_id: params.customerId,
          channel: "email",
          message_type: "transactional",
          provider: "brevo",
          status: "failed",
          recipient: params.recipientEmail,
          subject: params.subject,
          template_name: params.template,
          error_message: result.message || "Unknown error",
          error_code: result.code,
        });

        return {
          success: false,
          error: result.message || "Failed to send email",
          errorCode: result.code,
        };
      }

      await logMessage({
        business_id: params.businessId,
        customer_id: params.customerId,
        channel: "email",
        message_type: "transactional",
        provider: "brevo",
        provider_message_id: result.messageId,
        status: "sent",
        recipient: params.recipientEmail,
        subject: params.subject,
        template_name: params.template,
        cost_estimate: COST_ESTIMATES.brevo.email,
      });

      return {
        success: true,
        messageId: result.messageId,
        costEstimate: COST_ESTIMATES.brevo.email,
      };
    } catch (error) {
      console.error("Brevo transactional email error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendMarketing(params: MarketingEmailCampaignParams): Promise<CampaignResult> {
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
        "email"
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
        // Personalize content
        let personalizedHtml = params.htmlContent;
        let personalizedSubject = params.subject;

        personalizedHtml = personalizedHtml.replace(/{name}/g, recipient.name);
        personalizedSubject = personalizedSubject.replace(/{name}/g, recipient.name);

        if (recipient.data) {
          for (const [key, value] of Object.entries(recipient.data)) {
            const regex = new RegExp(`{${key}}`, "g");
            personalizedHtml = personalizedHtml.replace(regex, String(value));
            personalizedSubject = personalizedSubject.replace(regex, String(value));
          }
        }

        const response = await fetch(`${this.baseUrl}/smtp/email`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": this.apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: params.fromName,
              email: "marketing@booking.lovable.app",
            },
            to: [
              {
                email: recipient.email,
                name: recipient.name,
              },
            ],
            subject: personalizedSubject,
            htmlContent: this.wrapMarketingHtml(personalizedHtml, recipient.email),
            tags: ["marketing", params.campaignId || "manual"],
            headers: {
              "List-Unsubscribe": `<mailto:unsubscribe@booking.lovable.app?subject=unsubscribe&body=${recipient.email}>`,
            },
          }),
        });

        const apiResult = await response.json();

        if (response.ok) {
          result.sent++;
          await incrementMarketingCounter(recipient.customerId, params.businessId, "email");
          
          await logMessage({
            business_id: params.businessId,
            customer_id: recipient.customerId,
            channel: "email",
            message_type: "marketing",
            provider: "brevo",
            provider_message_id: apiResult.messageId,
            status: "sent",
            recipient: recipient.email,
            subject: personalizedSubject,
            message_preview: personalizedHtml.substring(0, 200),
            cost_estimate: COST_ESTIMATES.brevo.email,
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
            channel: "email",
            message_type: "marketing",
            provider: "brevo",
            status: "failed",
            recipient: recipient.email,
            subject: personalizedSubject,
            error_message: apiResult.message,
            error_code: apiResult.code,
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

  private buildTransactionalHtml(template: string, data: Record<string, unknown>): string {
    // Template-based HTML generation for transactional emails
    const templates: Record<string, (d: Record<string, unknown>) => string> = {
      booking_confirmation: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Booking Confirmed! ✓</h1>
          <p>Hi ${d.customerName},</p>
          <p>Your appointment has been confirmed:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p><strong>Service:</strong> ${d.serviceName}</p>
            <p><strong>Date & Time:</strong> ${d.dateTime}</p>
            <p><strong>Location:</strong> ${d.businessName}</p>
          </div>
        </div>
      `,
      booking_reminder: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Appointment Reminder</h1>
          <p>Hi ${d.customerName},</p>
          <p>Just a reminder about your upcoming appointment:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p><strong>Service:</strong> ${d.serviceName}</p>
            <p><strong>Date & Time:</strong> ${d.dateTime}</p>
          </div>
        </div>
      `,
      booking_cancelled: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EF4444;">Booking Cancelled</h1>
          <p>Hi ${d.customerName},</p>
          <p>Your appointment for ${d.serviceName} on ${d.dateTime} has been cancelled.</p>
          <p>We hope to see you again soon!</p>
        </div>
      `,
    };

    const templateFn = templates[template];
    if (templateFn) {
      return templateFn(data);
    }

    // Fallback: simple text rendering
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${JSON.stringify(data)}
    </div>`;
  }

  private wrapMarketingHtml(content: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
        ${content}
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          You received this email because you opted in to marketing communications.
          <br>
          <a href="mailto:unsubscribe@booking.lovable.app?subject=unsubscribe&body=${email}" style="color: #94a3b8;">
            Unsubscribe from marketing emails
          </a>
        </p>
      </body>
      </html>
    `;
  }
}
