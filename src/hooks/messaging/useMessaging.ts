import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for the messaging system
export type MessageChannel = "email" | "sms" | "whatsapp";
export type MessageType = "transactional" | "marketing";

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
  consent_source: string | null;
  consent_timestamp: string | null;
}

export interface MessageLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: MessageChannel;
  message_type: MessageType;
  provider: string;
  provider_message_id: string | null;
  status: string;
  recipient: string;
  subject: string | null;
  template_name: string | null;
  message_preview: string | null;
  cost_estimate: number | null;
  error_message: string | null;
  campaign_id: string | null;
  created_at: string;
}

interface SendTransactionalParams {
  channel: MessageChannel;
  businessId: string;
  customerId: string;
  recipient: string;
  recipientName?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  message?: string;
  subject?: string;
}

interface SendMarketingParams {
  channel: MessageChannel;
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

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface CampaignResult {
  totalRecipients: number;
  sent: number;
  failed: number;
  blocked: number;
  errors: Array<{ customerId: string; error: string }>;
}

// Hook to get contact preferences for a customer
export function useContactPreferences(customerId: string | undefined, businessId: string | undefined) {
  return useQuery({
    queryKey: ["contact-preferences", customerId, businessId],
    queryFn: async () => {
      if (!customerId || !businessId) return null;

      const { data, error } = await supabase
        .from("customer_contact_preferences")
        .select("*")
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) throw error;
      return data as ContactPreferences | null;
    },
    enabled: !!customerId && !!businessId,
  });
}

// Hook to update contact preferences
export function useUpdateContactPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      businessId,
      preferences,
    }: {
      customerId: string;
      businessId: string;
      preferences: Partial<ContactPreferences>;
    }) => {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from("customer_contact_preferences")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("customer_contact_preferences")
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("customer_contact_preferences")
          .insert({
            customer_id: customerId,
            business_id: businessId,
            ...preferences,
            consent_timestamp: new Date().toISOString(),
            consent_source: "settings_page",
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["contact-preferences", variables.customerId, variables.businessId],
      });
    },
  });
}

// Hook to send a transactional message
export function useSendTransactionalMessage() {
  return useMutation({
    mutationFn: async (params: SendTransactionalParams): Promise<SendResult> => {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: {
          type: "transactional",
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Failed to send transactional message:", error);
      toast.error("Failed to send message");
    },
  });
}

// Hook to send a marketing campaign
export function useSendMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMarketingParams): Promise<CampaignResult> => {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: {
          type: "marketing",
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["message-logs", variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      if (result.sent > 0) {
        toast.success(`Campaign sent to ${result.sent} recipients`);
      }
      if (result.blocked > 0) {
        toast.warning(`${result.blocked} recipients blocked (no opt-in or rate limited)`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} messages failed to send`);
      }
    },
    onError: (error) => {
      console.error("Failed to send marketing campaign:", error);
      toast.error("Failed to send campaign");
    },
  });
}

// Hook to get message logs
export function useMessageLogs(businessId: string | undefined, options?: {
  channel?: MessageChannel;
  messageType?: MessageType;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["message-logs", businessId, options],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from("message_logs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (options?.channel) {
        query = query.eq("channel", options.channel);
      }
      if (options?.messageType) {
        query = query.eq("message_type", options.messageType);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MessageLog[];
    },
    enabled: !!businessId,
  });
}

// Hook to get messaging stats
export function useMessagingStats(businessId: string | undefined, dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ["messaging-stats", businessId, dateRange],
    queryFn: async () => {
      if (!businessId) return null;

      let query = supabase
        .from("message_logs")
        .select("channel, message_type, status, cost_estimate")
        .eq("business_id", businessId);

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate stats
      const stats = {
        total: data.length,
        byChannel: {
          email: data.filter((m) => m.channel === "email").length,
          sms: data.filter((m) => m.channel === "sms").length,
          whatsapp: data.filter((m) => m.channel === "whatsapp").length,
        },
        byType: {
          transactional: data.filter((m) => m.message_type === "transactional").length,
          marketing: data.filter((m) => m.message_type === "marketing").length,
        },
        byStatus: {
          sent: data.filter((m) => m.status === "sent").length,
          delivered: data.filter((m) => m.status === "delivered").length,
          failed: data.filter((m) => m.status === "failed").length,
          bounced: data.filter((m) => m.status === "bounced").length,
        },
        totalCost: data.reduce((sum, m) => sum + (m.cost_estimate || 0), 0),
      };

      return stats;
    },
    enabled: !!businessId,
  });
}

// Export everything
export {
  type SendTransactionalParams,
  type SendMarketingParams,
  type SendResult,
  type CampaignResult,
};
