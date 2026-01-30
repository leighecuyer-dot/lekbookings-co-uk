import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

export interface DashboardWidgetSettings {
  showPerformanceTile: boolean;
  showRevenueTile: boolean;
  showTrendsChart: boolean;
  showAvailabilityTile: boolean;
}

const STORAGE_KEY = "dashboard-widget-settings";

const DEFAULT_SETTINGS: DashboardWidgetSettings = {
  showPerformanceTile: true,
  showRevenueTile: true,
  showTrendsChart: true,
  showAvailabilityTile: true,
};

export function useDashboardWidgetSettings() {
  const [settings, setSettings] = useState<DashboardWidgetSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof DashboardWidgetSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}

interface DashboardWidgetToggleProps {
  settings: DashboardWidgetSettings;
  onUpdateSetting: (key: keyof DashboardWidgetSettings, value: boolean) => void;
}

export function DashboardWidgetToggle({
  settings,
  onUpdateSetting,
}: DashboardWidgetToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-4">
          <div className="font-medium text-sm">Dashboard Widgets</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="availability" className="text-sm font-normal cursor-pointer">
                Available Slots
              </Label>
              <Switch
                id="availability"
                checked={settings.showAvailabilityTile}
                onCheckedChange={(checked) => onUpdateSetting("showAvailabilityTile", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="performance" className="text-sm font-normal cursor-pointer">
                Weekly Performance
              </Label>
              <Switch
                id="performance"
                checked={settings.showPerformanceTile}
                onCheckedChange={(checked) => onUpdateSetting("showPerformanceTile", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="revenue" className="text-sm font-normal cursor-pointer">
                Revenue Growth
              </Label>
              <Switch
                id="revenue"
                checked={settings.showRevenueTile}
                onCheckedChange={(checked) => onUpdateSetting("showRevenueTile", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="trends" className="text-sm font-normal cursor-pointer">
                Trends Chart
              </Label>
              <Switch
                id="trends"
                checked={settings.showTrendsChart}
                onCheckedChange={(checked) => onUpdateSetting("showTrendsChart", checked)}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
