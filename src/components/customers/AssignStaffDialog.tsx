import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface AssignStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  businessId: string;
}

export function AssignStaffDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  businessId,
}: AssignStaffDialogProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<Set<string>>(new Set());
  const [initialStaffIds, setInitialStaffIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, customerId, businessId]);

  const fetchData = async () => {
    setLoading(true);
    const [staffResult, assignmentsResult] = await Promise.all([
      supabase
        .from("staff")
        .select("id, name, avatar_url")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("staff_customers")
        .select("staff_id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId),
    ]);

    if (staffResult.data) setStaff(staffResult.data);
    const ids = new Set((assignmentsResult.data || []).map((a) => a.staff_id));
    setAssignedStaffIds(ids);
    setInitialStaffIds(new Set(ids));
    setLoading(false);
  };

  const toggleStaff = (staffId: string) => {
    setAssignedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);

    const toAdd = [...assignedStaffIds].filter((id) => !initialStaffIds.has(id));
    const toRemove = [...initialStaffIds].filter((id) => !assignedStaffIds.has(id));

    if (toAdd.length > 0) {
      await supabase.from("staff_customers").insert(
        toAdd.map((staff_id) => ({
          staff_id,
          customer_id: customerId,
          business_id: businessId,
        }))
      );
    }

    if (toRemove.length > 0) {
      await supabase
        .from("staff_customers")
        .delete()
        .eq("customer_id", customerId)
        .eq("business_id", businessId)
        .in("staff_id", toRemove);
    }

    toast.success("Staff assignments updated");
    setSaving(false);
    onOpenChange(false);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Staff to {customerName}</DialogTitle>
          <DialogDescription>
            Select which staff members should be assigned to this customer.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No staff members found. Add staff first.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {staff.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={assignedStaffIds.has(member.id)}
                  onCheckedChange={() => toggleStaff(member.id)}
                />
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{member.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
