import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CircleDot, CheckCircle2, XCircle, LucideIcon } from "lucide-react";

// Color presets for status customization
export const colorPresets = [
  { 
    id: "amber", 
    name: "Amber",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700"
  },
  { 
    id: "emerald", 
    name: "Green",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700"
  },
  { 
    id: "blue", 
    name: "Blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-700"
  },
  { 
    id: "purple", 
    name: "Purple",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-300 dark:border-purple-700"
  },
  { 
    id: "pink", 
    name: "Pink",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    textColor: "text-pink-700 dark:text-pink-400",
    borderColor: "border-pink-300 dark:border-pink-700"
  },
  { 
    id: "red", 
    name: "Red",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700"
  },
  { 
    id: "orange", 
    name: "Orange",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-300 dark:border-orange-700"
  },
  { 
    id: "gray", 
    name: "Gray",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-border"
  },
];

export const defaultStatusConfig = [
  { 
    id: "pending", 
    label: "Pending", 
    icon: CircleDot,
    description: "Awaiting confirmation",
    colorId: "amber"
  },
  { 
    id: "confirmed", 
    label: "Confirmed", 
    icon: CheckCircle2,
    description: "Ready to go",
    colorId: "emerald"
  },
  { 
    id: "completed", 
    label: "Done", 
    icon: CheckCircle2,
    description: "Finished",
    colorId: "gray"
  },
  { 
    id: "cancelled", 
    label: "Cancelled", 
    icon: XCircle,
    description: "Not happening",
    colorId: "red"
  },
];

export interface StatusConfigItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  colorId: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  name: string;
}

export function getColorStyles(colorId: string) {
  return colorPresets.find(c => c.id === colorId) || colorPresets[0];
}

export function useKanbanSettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();

  // Get custom settings from business - safely cast settings to object
  const settings = (currentBusiness?.settings && typeof currentBusiness.settings === 'object' && !Array.isArray(currentBusiness.settings))
    ? currentBusiness.settings as Record<string, unknown>
    : {};
  const customLabels = (settings.statusLabels as Record<string, string>) || {};
  const customColors = (settings.statusColors as Record<string, string>) || {};
  
  // Merge default config with custom labels and colors
  const statusConfig: StatusConfigItem[] = defaultStatusConfig.map(status => {
    const colorId = customColors[status.id] || status.colorId;
    const colorStyles = getColorStyles(colorId);
    return {
      ...status,
      label: customLabels[status.id] || status.label,
      colorId,
      ...colorStyles
    };
  });

  const getStatusConfig = (statusId: string) => {
    return statusConfig.find(s => s.id === statusId) || statusConfig[0];
  };

  const updateLabel = async (statusId: string, newLabel: string) => {
    if (!currentBusiness) return false;
    
    const trimmedLabel = newLabel.trim();
    const defaultLabel = defaultStatusConfig.find(s => s.id === statusId)?.label || statusId;
    
    const newLabels = {
      ...customLabels,
      [statusId]: trimmedLabel || defaultLabel
    };

    const currentSettings = (currentBusiness.settings && typeof currentBusiness.settings === 'object' && !Array.isArray(currentBusiness.settings))
      ? currentBusiness.settings as Record<string, unknown>
      : {};
    
    const { error } = await supabase
      .from("businesses")
      .update({ 
        settings: { 
          ...currentSettings, 
          statusLabels: newLabels 
        } 
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update label");
      return false;
    }
    
    toast.success("Label updated");
    await refreshBusinesses();
    return true;
  };

  const updateColor = async (statusId: string, colorId: string) => {
    if (!currentBusiness) return false;
    
    const newColors = {
      ...customColors,
      [statusId]: colorId
    };

    const currentSettings = (currentBusiness.settings && typeof currentBusiness.settings === 'object' && !Array.isArray(currentBusiness.settings))
      ? currentBusiness.settings as Record<string, unknown>
      : {};
    
    const { error } = await supabase
      .from("businesses")
      .update({ 
        settings: { 
          ...currentSettings, 
          statusColors: newColors 
        } 
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update color");
      return false;
    }
    
    toast.success("Color updated");
    await refreshBusinesses();
    return true;
  };

  return {
    statusConfig,
    colorPresets,
    getStatusConfig,
    updateLabel,
    updateColor,
  };
}
