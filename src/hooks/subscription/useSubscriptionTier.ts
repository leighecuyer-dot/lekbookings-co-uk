import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "essential" | "professional" | "enterprise" | "unknown";

export interface TierLimits {
  maxStaff: number;
  maxBookingsPerMonth: number;
  maxSmsPerMonth: number;
  hasAdvancedAnalytics: boolean;
  hasApiAccess: boolean;
  hasFullPageBuilder: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  essential: {
    maxStaff: 1,
    maxBookingsPerMonth: 100,
    maxSmsPerMonth: 50,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasFullPageBuilder: false,
  },
  professional: {
    maxStaff: 5,
    maxBookingsPerMonth: Infinity,
    maxSmsPerMonth: 200,
    hasAdvancedAnalytics: true,
    hasApiAccess: false,
    hasFullPageBuilder: false,
  },
  enterprise: {
    maxStaff: Infinity,
    maxBookingsPerMonth: Infinity,
    maxSmsPerMonth: Infinity,
    hasAdvancedAnalytics: true,
    hasApiAccess: true,
    hasFullPageBuilder: true,
  },
  unknown: {
    maxStaff: 1,
    maxBookingsPerMonth: 100,
    maxSmsPerMonth: 50,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasFullPageBuilder: false,
  },
};

export function useSubscriptionTier(businessId: string | null) {
  const [tier, setTier] = useState<SubscriptionTier>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTier() {
      if (!businessId) {
        setTier("unknown");
        setLoading(false);
        return;
      }

      // Check if this business has a reseller client record with subscription tier
      const { data, error } = await supabase
        .from("reseller_clients")
        .select("subscription_tier")
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription tier:", error);
        // Default to essential if no reseller_client record exists (direct signup)
        setTier("essential");
      } else if (data?.subscription_tier) {
        setTier(data.subscription_tier as SubscriptionTier);
      } else {
        // No reseller client record = direct signup, default to essential
        setTier("essential");
      }
      
      setLoading(false);
    }

    fetchTier();
  }, [businessId]);

  const limits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    loading,
    isEssential: tier === "essential",
    isProfessional: tier === "professional",
    isEnterprise: tier === "enterprise",
    canAddStaff: (currentCount: number) => currentCount < limits.maxStaff,
  };
}
