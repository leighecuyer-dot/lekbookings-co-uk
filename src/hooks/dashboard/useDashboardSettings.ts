import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DashboardWidgetSettings } from "@/components/dashboard/DashboardWidgetToggle";
import type { WidgetId, WidgetSize } from "@/components/dashboard/DraggableWidgetGrid";

// Local storage keys for fallback
const WIDGET_ORDER_KEY = "dashboard-widget-order";
const WIDGET_SIZES_KEY = "dashboard-widget-sizes";
const WIDGET_SETTINGS_KEY = "dashboard-widget-settings";

// Default values
export const DEFAULT_WIDGET_ORDER: WidgetId[] = ["availability", "performance", "revenue", "revenueBreakdown", "trends"];
export const DEFAULT_WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
  availability: 1,
  performance: 1,
  revenue: 1,
  revenueBreakdown: 2,
  trends: 3,
};
export const DEFAULT_WIDGET_VISIBILITY: DashboardWidgetSettings = {
  showPerformanceTile: true,
  showRevenueTile: true,
  showRevenueBreakdownTile: true,
  showTrendsChart: true,
  showAvailabilityTile: true,
};

interface DashboardSettingsRow {
  id: string;
  business_id: string;
  user_id: string;
  widget_order: string[];
  widget_visibility: DashboardWidgetSettings;
  widget_sizes: Record<WidgetId, WidgetSize>;
  created_at: string;
  updated_at: string;
}

function getLocalStorageSettings() {
  try {
    const order = localStorage.getItem(WIDGET_ORDER_KEY);
    const sizes = localStorage.getItem(WIDGET_SIZES_KEY);
    const visibility = localStorage.getItem(WIDGET_SETTINGS_KEY);
    
    return {
      widget_order: order ? JSON.parse(order) : DEFAULT_WIDGET_ORDER,
      widget_sizes: sizes ? JSON.parse(sizes) : DEFAULT_WIDGET_SIZES,
      widget_visibility: visibility ? { ...DEFAULT_WIDGET_VISIBILITY, ...JSON.parse(visibility) } : DEFAULT_WIDGET_VISIBILITY,
    };
  } catch {
    return {
      widget_order: DEFAULT_WIDGET_ORDER,
      widget_sizes: DEFAULT_WIDGET_SIZES,
      widget_visibility: DEFAULT_WIDGET_VISIBILITY,
    };
  }
}

function setLocalStorageSettings(settings: {
  widget_order: WidgetId[];
  widget_sizes: Record<WidgetId, WidgetSize>;
  widget_visibility: DashboardWidgetSettings;
}) {
  try {
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(settings.widget_order));
    localStorage.setItem(WIDGET_SIZES_KEY, JSON.stringify(settings.widget_sizes));
    localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings.widget_visibility));
  } catch {
    // Ignore localStorage errors
  }
}

export function useDashboardSettings() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const businessId = currentBusiness?.id;
  const userId = user?.id;

  // Fetch settings from database
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["dashboard-settings", businessId, userId],
    queryFn: async () => {
      if (!businessId || !userId) return null;
      
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("*")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching dashboard settings:", error);
        return null;
      }
      
      if (!data) return null;
      
      // Parse the JSONB fields safely
      return {
        id: data.id,
        business_id: data.business_id,
        user_id: data.user_id,
        widget_order: data.widget_order || DEFAULT_WIDGET_ORDER,
        widget_visibility: (data.widget_visibility as unknown as DashboardWidgetSettings) || DEFAULT_WIDGET_VISIBILITY,
        widget_sizes: (data.widget_sizes as unknown as Record<WidgetId, WidgetSize>) || DEFAULT_WIDGET_SIZES,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as DashboardSettingsRow;
    },
    enabled: !!businessId && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (settings: {
      widget_order: WidgetId[];
      widget_sizes: Record<WidgetId, WidgetSize>;
      widget_visibility: DashboardWidgetSettings;
    }) => {
      if (!businessId || !userId) {
        // Fall back to localStorage only
        setLocalStorageSettings(settings);
        return null;
      }

      // Use insert with ON CONFLICT DO UPDATE pattern
      const { error: upsertError } = await supabase
        .from("dashboard_settings")
        .upsert(
          [
            {
              business_id: businessId,
              user_id: userId,
              widget_order: settings.widget_order as string[],
              widget_visibility: JSON.parse(JSON.stringify(settings.widget_visibility)),
              widget_sizes: JSON.parse(JSON.stringify(settings.widget_sizes)),
            },
          ],
          {
            onConflict: "business_id,user_id",
          }
        );
      
      if (upsertError) {
        console.error("Error saving dashboard settings:", upsertError);
        throw upsertError;
      }
      
      // Also update localStorage as cache
      setLocalStorageSettings(settings);
      
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-settings", businessId, userId] });
    },
    onError: () => {
      toast.error("Failed to save dashboard layout");
    },
  });

  // Get current settings (prefer DB, fallback to localStorage)
  const localSettings = getLocalStorageSettings();
  
  const settings = dbSettings ? {
    widget_order: (dbSettings.widget_order || DEFAULT_WIDGET_ORDER) as WidgetId[],
    widget_sizes: (dbSettings.widget_sizes || DEFAULT_WIDGET_SIZES) as Record<WidgetId, WidgetSize>,
    widget_visibility: (dbSettings.widget_visibility || DEFAULT_WIDGET_VISIBILITY) as DashboardWidgetSettings,
  } : localSettings;

  // Debounced save function
  const saveSettings = useCallback((newSettings: {
    widget_order: WidgetId[];
    widget_sizes: Record<WidgetId, WidgetSize>;
    widget_visibility: DashboardWidgetSettings;
  }) => {
    saveMutation.mutate(newSettings);
  }, [saveMutation]);

  return {
    settings,
    isLoading,
    saveSettings,
    isSaving: saveMutation.isPending,
  };
}

// Hook for widget order management
export function useWidgetOrder() {
  const { settings, saveSettings } = useDashboardSettings();
  const [localOrder, setLocalOrder] = useState<WidgetId[]>(settings.widget_order);
  
  // Sync local state with DB settings
  useEffect(() => {
    setLocalOrder(settings.widget_order);
  }, [settings.widget_order]);

  const reorder = useCallback((activeId: WidgetId, overId: WidgetId) => {
    setLocalOrder((items) => {
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      const newOrder = [...items];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);
      
      // Save to database
      saveSettings({
        widget_order: newOrder,
        widget_sizes: settings.widget_sizes,
        widget_visibility: settings.widget_visibility,
      });
      
      return newOrder;
    });
  }, [saveSettings, settings.widget_sizes, settings.widget_visibility]);

  const resetOrder = useCallback(() => {
    setLocalOrder([...DEFAULT_WIDGET_ORDER]);
    saveSettings({
      widget_order: DEFAULT_WIDGET_ORDER,
      widget_sizes: settings.widget_sizes,
      widget_visibility: settings.widget_visibility,
    });
  }, [saveSettings, settings.widget_sizes, settings.widget_visibility]);

  return { order: localOrder, reorder, resetOrder };
}

// Hook for widget sizes management
export function useWidgetSizes() {
  const { settings, saveSettings } = useDashboardSettings();
  const [localSizes, setLocalSizes] = useState<Record<WidgetId, WidgetSize>>(settings.widget_sizes);
  
  // Sync local state with DB settings
  useEffect(() => {
    setLocalSizes(settings.widget_sizes);
  }, [settings.widget_sizes]);

  const setSize = useCallback((id: WidgetId, size: WidgetSize) => {
    setLocalSizes((prev) => {
      const newSizes = { ...prev, [id]: size };
      
      // Save to database
      saveSettings({
        widget_order: settings.widget_order,
        widget_sizes: newSizes,
        widget_visibility: settings.widget_visibility,
      });
      
      return newSizes;
    });
  }, [saveSettings, settings.widget_order, settings.widget_visibility]);

  const resetSizes = useCallback(() => {
    setLocalSizes({ ...DEFAULT_WIDGET_SIZES });
    saveSettings({
      widget_order: settings.widget_order,
      widget_sizes: DEFAULT_WIDGET_SIZES,
      widget_visibility: settings.widget_visibility,
    });
  }, [saveSettings, settings.widget_order, settings.widget_visibility]);

  return { sizes: localSizes, setSize, resetSizes };
}

// Hook for widget visibility management
export function useWidgetVisibility() {
  const { settings, saveSettings } = useDashboardSettings();
  const [localVisibility, setLocalVisibility] = useState<DashboardWidgetSettings>(settings.widget_visibility);
  
  // Sync local state with DB settings
  useEffect(() => {
    setLocalVisibility(settings.widget_visibility);
  }, [settings.widget_visibility]);

  const updateSetting = useCallback((key: keyof DashboardWidgetSettings, value: boolean) => {
    setLocalVisibility((prev) => {
      const newVisibility = { ...prev, [key]: value };
      
      // Save to database
      saveSettings({
        widget_order: settings.widget_order,
        widget_sizes: settings.widget_sizes,
        widget_visibility: newVisibility,
      });
      
      return newVisibility;
    });
  }, [saveSettings, settings.widget_order, settings.widget_sizes]);

  const resetSettings = useCallback(() => {
    setLocalVisibility({ ...DEFAULT_WIDGET_VISIBILITY });
    saveSettings({
      widget_order: settings.widget_order,
      widget_sizes: settings.widget_sizes,
      widget_visibility: DEFAULT_WIDGET_VISIBILITY,
    });
  }, [saveSettings, settings.widget_order, settings.widget_sizes]);

  return { 
    settings: localVisibility, 
    updateSetting, 
    resetSettings 
  };
}
