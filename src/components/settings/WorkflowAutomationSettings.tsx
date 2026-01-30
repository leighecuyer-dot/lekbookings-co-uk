import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings2, MessageSquare, CreditCard, CheckCircle2, DollarSign } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export interface WorkflowConfig {
  // Confirmation triggers
  confirmOnDepositPaid: boolean;
  confirmOnFullPayment: boolean;
  confirmOnCustomerResponse: boolean;
  // Completion behavior
  autoAddRevenueOnComplete: boolean;
  // Notification style
  showUndoNotification: boolean;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  confirmOnDepositPaid: true,
  confirmOnFullPayment: true,
  confirmOnCustomerResponse: true,
  autoAddRevenueOnComplete: true,
  showUndoNotification: true,
};

export function getWorkflowConfig(businessSettings: Record<string, unknown> | null): WorkflowConfig {
  if (!businessSettings?.workflowConfig) {
    return DEFAULT_WORKFLOW_CONFIG;
  }
  return { ...DEFAULT_WORKFLOW_CONFIG, ...(businessSettings.workflowConfig as WorkflowConfig) };
}

export function WorkflowAutomationSettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG);

  useEffect(() => {
    if (currentBusiness?.settings) {
      const settings = currentBusiness.settings as Record<string, unknown>;
      setConfig(getWorkflowConfig(settings));
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    const existingSettings = (currentBusiness.settings as Record<string, unknown>) || {};

    const newSettings = {
      ...existingSettings,
      workflowConfig: config,
    };

    const { error } = await supabase
      .from("businesses")
      .update({ settings: newSettings as unknown as Json })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to save workflow settings");
    } else {
      toast.success("Workflow settings saved!");
      refreshBusinesses();
    }
    setLoading(false);
  };

  const sections = [
    {
      title: "Confirmation Triggers",
      description: "Choose what actions automatically confirm a pending booking",
      icon: CheckCircle2,
      items: [
        {
          key: "confirmOnDepositPaid" as const,
          icon: CreditCard,
          label: "Deposit Paid",
          description: "Automatically confirm when customer pays their deposit",
        },
        {
          key: "confirmOnFullPayment" as const,
          icon: DollarSign,
          label: "Full Payment",
          description: "Automatically confirm when customer pays in full",
        },
        {
          key: "confirmOnCustomerResponse" as const,
          icon: MessageSquare,
          label: "Customer Response",
          description: "Confirm when customer replies 'yes' or 'confirm' via SMS/WhatsApp/Email",
        },
      ],
    },
    {
      title: "Completion Behavior",
      description: "Configure what happens when a booking is marked complete",
      icon: DollarSign,
      items: [
        {
          key: "autoAddRevenueOnComplete" as const,
          icon: DollarSign,
          label: "Add to Revenue",
          description: "Automatically add service price to revenue when booking is completed",
        },
      ],
    },
    {
      title: "Notification Style",
      description: "How status changes are communicated",
      icon: MessageSquare,
      items: [
        {
          key: "showUndoNotification" as const,
          icon: Settings2,
          label: "Show Undo Option",
          description: "Display a notification with undo button before automatic status changes",
        },
      ],
    },
  ];

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Workflow Automation
        </CardTitle>
        <CardDescription>
          Configure how booking statuses change automatically based on customer actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section, sectionIdx) => (
          <div key={section.title}>
            {sectionIdx > 0 && <Separator className="my-6" />}
            <div className="mb-4">
              <h3 className="flex items-center gap-2 font-medium text-sm">
                <section.icon className="w-4 h-4 text-muted-foreground" />
                {section.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                      <Label className="font-medium cursor-pointer">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config[item.key]}
                    onCheckedChange={(checked) => setConfig({ ...config, [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Visual Flow Preview */}
        <div className="p-4 rounded-lg border border-border bg-muted/30 mt-6">
          <h4 className="font-medium text-sm mb-3">Your Booking Flow</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
              Pending
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground text-xs">
              {[
                config.confirmOnDepositPaid && "Deposit",
                config.confirmOnFullPayment && "Full payment",
                config.confirmOnCustomerResponse && "Customer confirms",
              ]
                .filter(Boolean)
                .join(" / ") || "Manual only"}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium">
              Confirmed
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground text-xs">Service complete</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2 py-1 rounded bg-gray-500/20 text-gray-700 dark:text-gray-400 font-medium">
              Completed
            </span>
            {config.autoAddRevenueOnComplete && (
              <>
                <span className="text-muted-foreground">+</span>
                <span className="px-2 py-1 rounded bg-primary/20 text-primary font-medium">
                  Revenue Added
                </span>
              </>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary">
          {loading ? "Saving..." : "Save Workflow Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
