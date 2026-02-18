import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Phone,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomerPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  businessId: string;
}

interface ContactPreferences {
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
  marketing_messages_this_week: number;
  week_start_date: string | null;
}

export function CustomerPreferencesDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  businessId,
}: CustomerPreferencesDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<ContactPreferences | null>(null);
  const [formData, setFormData] = useState({
    email: customerEmail || "",
    phone: customerPhone || "",
    whatsapp: "",
    transactional_email_enabled: true,
    transactional_sms_enabled: true,
    transactional_whatsapp_enabled: true,
    marketing_email_opt_in: false,
    marketing_sms_opt_in: false,
    marketing_whatsapp_opt_in: false,
  });

  useEffect(() => {
    if (open && customerId && businessId) {
      fetchPreferences();
    }
  }, [open, customerId, businessId]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_contact_preferences")
        .select("*")
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data);
        setFormData({
          email: data.email || customerEmail || "",
          phone: data.phone || customerPhone || "",
          whatsapp: data.whatsapp || "",
          transactional_email_enabled: data.transactional_email_enabled,
          transactional_sms_enabled: data.transactional_sms_enabled,
          transactional_whatsapp_enabled: data.transactional_whatsapp_enabled,
          marketing_email_opt_in: data.marketing_email_opt_in,
          marketing_sms_opt_in: data.marketing_sms_opt_in,
          marketing_whatsapp_opt_in: data.marketing_whatsapp_opt_in,
        });
      } else {
        // No preferences yet, use defaults
        setPreferences(null);
        setFormData({
          email: customerEmail || "",
          phone: customerPhone || "",
          whatsapp: customerPhone || "",
          transactional_email_enabled: true,
          transactional_sms_enabled: true,
          transactional_whatsapp_enabled: true,
          marketing_email_opt_in: false,
          marketing_sms_opt_in: false,
          marketing_whatsapp_opt_in: false,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        business_id: businessId,
        email: formData.email || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        transactional_email_enabled: formData.transactional_email_enabled,
        transactional_sms_enabled: formData.transactional_sms_enabled,
        transactional_whatsapp_enabled: formData.transactional_whatsapp_enabled,
        marketing_email_opt_in: formData.marketing_email_opt_in,
        marketing_sms_opt_in: formData.marketing_sms_opt_in,
        marketing_whatsapp_opt_in: formData.marketing_whatsapp_opt_in,
        consent_source: "settings_page",
        consent_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (preferences?.id) {
        // Update existing
        const { error } = await supabase
          .from("customer_contact_preferences")
          .update(payload)
          .eq("id", preferences.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("customer_contact_preferences")
          .insert(payload);

        if (error) throw error;
      }

      toast.success("Preferences saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Contact Preferences
          </DialogTitle>
          <DialogDescription>
            Manage communication preferences for {customerName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="WhatsApp number (if different)"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Transactional Messages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Service Messages</h4>
                <Badge variant="outline" className="text-xs">Transactional</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Booking confirmations, reminders, and updates
              </p>
              <div className="space-y-2">
                {[
                  { id: "trans-email", icon: <Mail className="h-3.5 w-3.5 shrink-0" />, label: "Email", key: "transactional_email_enabled" as const },
                  { id: "trans-sms", icon: <Phone className="h-3.5 w-3.5 shrink-0" />, label: "SMS", key: "transactional_sms_enabled" as const },
                  { id: "trans-whatsapp", icon: <MessageSquare className="h-3.5 w-3.5 shrink-0" />, label: "WhatsApp", key: "transactional_whatsapp_enabled" as const },
                ].map(({ id, icon, label, key }) => (
                  <div key={id} className="flex items-center justify-between gap-4 min-h-[2rem]">
                    <span className="flex items-center gap-2 text-sm text-foreground shrink-0">
                      {icon}
                      {label}
                    </span>
                    <Switch
                      id={id}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Marketing Messages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Marketing Messages</h4>
                <Badge variant="outline" className="text-xs">Opt-in Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Promotions, offers, and availability updates
              </p>
              <div className="space-y-2">
                {[
                  { id: "mkt-email", icon: <Mail className="h-3.5 w-3.5 shrink-0" />, label: "Email Marketing", key: "marketing_email_opt_in" as const },
                  { id: "mkt-sms", icon: <Phone className="h-3.5 w-3.5 shrink-0" />, label: "SMS Marketing", key: "marketing_sms_opt_in" as const },
                  { id: "mkt-whatsapp", icon: <MessageSquare className="h-3.5 w-3.5 shrink-0" />, label: "WhatsApp Marketing", key: "marketing_whatsapp_opt_in" as const },
                ].map(({ id, icon, label, key }) => (
                  <div key={id} className="flex items-center justify-between gap-4 min-h-[2rem]">
                    <span className="flex items-center gap-2 text-sm text-foreground shrink-0">
                      {icon}
                      {label}
                    </span>
                    <Switch
                      id={id}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Consent Info */}
            {preferences?.consent_timestamp && (
              <>
                <Separator />
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <p>
                      Last updated: {format(new Date(preferences.consent_timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {preferences.consent_source && (
                      <p>Source: {preferences.consent_source}</p>
                    )}
                    {preferences.marketing_messages_this_week > 0 && (
                      <p className="flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {preferences.marketing_messages_this_week}/2 marketing messages sent this week
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
