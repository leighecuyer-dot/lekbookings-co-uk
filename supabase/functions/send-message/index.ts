import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  sendTransactionalEmail,
  sendTransactionalSMS,
  sendTransactionalWhatsApp,
  sendMarketingEmailCampaign,
  sendMarketingSMSCampaign,
  sendMarketingWhatsAppCampaign,
} from "../_shared/messaging/index.ts";
import { requireUser, userHasBusinessAccess } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TransactionalRequest {
  type: "transactional";
  channel: "email" | "sms" | "whatsapp";
  businessId: string;
  customerId: string;
  recipient: string;
  recipientName?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  message?: string;
  subject?: string;
}

interface MarketingRequest {
  type: "marketing";
  channel: "email" | "sms" | "whatsapp";
  businessId: string;
  campaignId?: string;
  recipients: Array<{
    customerId: string;
    email?: string;
    phone?: string;
    name: string;
    data?: Record<string, unknown>;
  }>;
  subject?: string;
  htmlContent?: string;
  message?: string;
  templateName?: string;
  fromName?: string;
}

type MessageRequest = TransactionalRequest | MarketingRequest;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller (blocks anonymous credential abuse).
  const authResult = await requireUser(req);
  if ("error" in authResult) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { user } = authResult;

  try {
    const request: MessageRequest = await req.json();

    // Validate required fields
    if (!request.type || !request.channel || !request.businessId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, channel, businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure the caller actually belongs to (or is a reseller for) the target business.
    const allowed = await userHasBusinessAccess(user.id, request.businessId);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Forbidden: no access to this business" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ============ Transactional Messages ============
    if (request.type === "transactional") {
      const txRequest = request as TransactionalRequest;

      if (!txRequest.customerId || !txRequest.recipient) {
        return new Response(
          JSON.stringify({ error: "Missing customerId or recipient" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let result;

      switch (txRequest.channel) {
        case "email":
          result = await sendTransactionalEmail({
            businessId: txRequest.businessId,
            customerId: txRequest.customerId,
            recipientEmail: txRequest.recipient,
            recipientName: txRequest.recipientName || "Customer",
            template: txRequest.template || "generic",
            data: txRequest.templateData || {},
            subject: txRequest.subject,
          });
          break;

        case "sms":
          if (!txRequest.message) {
            return new Response(
              JSON.stringify({ error: "Message required for SMS" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          result = await sendTransactionalSMS({
            businessId: txRequest.businessId,
            customerId: txRequest.customerId,
            recipientPhone: txRequest.recipient,
            message: txRequest.message,
            templateName: txRequest.template,
          });
          break;

        case "whatsapp":
          if (!txRequest.template) {
            return new Response(
              JSON.stringify({ error: "Template name required for WhatsApp" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          result = await sendTransactionalWhatsApp({
            businessId: txRequest.businessId,
            customerId: txRequest.customerId,
            recipientPhone: txRequest.recipient,
            templateName: txRequest.template,
            templateData: (txRequest.templateData || {}) as Record<string, string>,
          });
          break;

        default:
          return new Response(
            JSON.stringify({ error: "Invalid channel" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ Marketing Campaigns ============
    if (request.type === "marketing") {
      const mktRequest = request as MarketingRequest;

      if (!mktRequest.recipients || mktRequest.recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: "Recipients required for marketing campaigns" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let result;

      switch (mktRequest.channel) {
        case "email":
          if (!mktRequest.subject || !mktRequest.htmlContent) {
            return new Response(
              JSON.stringify({ error: "Subject and htmlContent required for email campaigns" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          result = await sendMarketingEmailCampaign({
            businessId: mktRequest.businessId,
            campaignId: mktRequest.campaignId,
            recipients: mktRequest.recipients.map((r) => ({
              customerId: r.customerId,
              email: r.email || "",
              name: r.name,
              data: r.data,
            })),
            subject: mktRequest.subject,
            htmlContent: mktRequest.htmlContent,
            fromName: mktRequest.fromName || "Your Business",
          });
          break;

        case "sms":
          if (!mktRequest.message) {
            return new Response(
              JSON.stringify({ error: "Message required for SMS campaigns" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          result = await sendMarketingSMSCampaign({
            businessId: mktRequest.businessId,
            campaignId: mktRequest.campaignId,
            recipients: mktRequest.recipients.map((r) => ({
              customerId: r.customerId,
              phone: r.phone || "",
              name: r.name,
            })),
            message: mktRequest.message,
          });
          break;

        case "whatsapp":
          if (!mktRequest.templateName) {
            return new Response(
              JSON.stringify({ error: "Template name required for WhatsApp campaigns" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          result = await sendMarketingWhatsAppCampaign({
            businessId: mktRequest.businessId,
            campaignId: mktRequest.campaignId,
            recipients: mktRequest.recipients.map((r) => ({
              customerId: r.customerId,
              phone: r.phone || "",
              name: r.name,
              templateData: (r.data || {}) as Record<string, string>,
            })),
            templateName: mktRequest.templateName,
          });
          break;

        default:
          return new Response(
            JSON.stringify({ error: "Invalid channel" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      console.log(
        `Marketing ${mktRequest.channel} campaign: ${result.sent} sent, ${result.failed} failed, ${result.blocked} blocked`
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
