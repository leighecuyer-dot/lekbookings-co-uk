import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateCampaignParams {
  businessId: string;
  name: string;
  campaignType: string;
  messageTemplate: string;
  targetAudience: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  recipientCustomerIds: string[];
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const createCampaign = useMutation({
    mutationFn: async (params: CreateCampaignParams) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          business_id: params.businessId,
          name: params.name,
          campaign_type: params.campaignType,
          message_template: params.messageTemplate,
          target_audience: params.targetAudience,
          recipient_count: params.recipientCount,
          sent_count: params.sentCount,
          failed_count: params.failedCount,
          recipient_customer_ids: params.recipientCustomerIds,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      console.error("Failed to save campaign:", error);
      // Don't show toast - campaign tracking is silent
    },
  });

  return {
    createCampaign,
  };
}

export { useCampaigns as default };
