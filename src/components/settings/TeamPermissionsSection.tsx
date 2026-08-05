import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ShieldCheck, Users } from "lucide-react";
import type { PageKey } from "@/hooks/permissions/useUserPermissions";

interface TeamMember {
  userId: string;
  role: string;
  fullName: string | null;
}

interface PermissionsRow {
  can_view_financials: boolean;
  page_access: Record<PageKey, boolean>;
  calendar_scope: "all" | "all_masked" | "own";
  booking_edit_scope: "all" | "own" | "none";
}


const PAGES: { key: PageKey; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "services", label: "Services" },
  { key: "waitlist", label: "Waitlist" },
  { key: "reports", label: "Reports & Campaigns" },
  { key: "messaging", label: "Message History" },
  { key: "settings", label: "Settings" },
];

const DEFAULT_PAGES: Record<PageKey, boolean> = {
  customers: true, reports: true, messaging: true, waitlist: true,
  settings: true, staff: true, services: true,
};

export function TeamPermissionsSection() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [perms, setPerms] = useState<Record<string, PermissionsRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness || !user) return;
    (async () => {
      setLoading(true);

      // Check current user is owner
      const { data: myRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("business_id", currentBusiness.id)
        .maybeSingle();
      const owner = myRole?.role === "owner";
      setIsOwner(owner);
      if (!owner) { setLoading(false); return; }

      // Fetch all non-owner members
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("business_id", currentBusiness.id)
        .in("role", ["admin", "staff"]);

      const userIds = (roles || []).map(r => r.user_id);
      let profiles: { user_id: string; full_name: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        profiles = p || [];
      }

      const teamMembers: TeamMember[] = (roles || []).map(r => ({
        userId: r.user_id,
        role: r.role,
        fullName: profiles.find(p => p.user_id === r.user_id)?.full_name ?? null,
      }));
      setMembers(teamMembers);

      // Fetch existing permissions
      const { data: existing } = await supabase
        .from("user_permissions")
        .select("user_id, can_view_financials, page_access, calendar_scope, booking_edit_scope")
        .eq("business_id", currentBusiness.id);

      const map: Record<string, PermissionsRow> = {};
      for (const m of teamMembers) {
        const row = existing?.find(e => e.user_id === m.userId);
        map[m.userId] = {
          can_view_financials: row?.can_view_financials ?? true,
          page_access: { ...DEFAULT_PAGES, ...((row?.page_access as Record<PageKey, boolean>) || {}) },
          calendar_scope: (row?.calendar_scope as PermissionsRow["calendar_scope"]) ?? "all",
          booking_edit_scope: (row?.booking_edit_scope as PermissionsRow["booking_edit_scope"]) ?? "all",
        };
      }
      setPerms(map);
      setLoading(false);
    })();
  }, [currentBusiness, user]);

  const savePermission = async (userId: string, next: PermissionsRow) => {
    if (!currentBusiness) return;
    const prev = perms[userId];
    setPerms({ ...perms, [userId]: next });

    const { error } = await supabase
      .from("user_permissions")
      .upsert({
        user_id: userId,
        business_id: currentBusiness.id,
        can_view_financials: next.can_view_financials,
        calendar_scope: next.calendar_scope,
        booking_edit_scope: next.booking_edit_scope,
        page_access: next.page_access as unknown as import("@/integrations/supabase/types").Json,
      }, { onConflict: "user_id,business_id" });


    if (error) {
      setPerms({ ...perms, [userId]: prev });
      toast.error("Failed to update permissions");
    } else {
      toast.success("Permissions updated");
    }
  };

  if (!isOwner) return null;

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Team Permissions
        </CardTitle>
        <CardDescription>
          Control what each admin and staff member can see. Owners always have full access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading team…</p>
        ) : members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No admin or staff users yet. Invite people from the Staff page.</p>
          </div>
        ) : (
          members.map((m, idx) => {
            const p = perms[m.userId];
            if (!p) return null;
            return (
              <div key={m.userId} className="space-y-3">
                {idx > 0 && <Separator />}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-medium">{m.fullName || "Unnamed user"}</p>
                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{m.role}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm">Financial data</Label>
                    <p className="text-xs text-muted-foreground">
                      Revenue tiles, commission %, prices on bookings
                    </p>
                  </div>
                  <Switch
                    checked={p.can_view_financials}
                    onCheckedChange={(v) => savePermission(m.userId, { ...p, can_view_financials: v })}
                  />
                </div>

                <div className="rounded-md border p-3 space-y-3">
                  <Label className="text-sm">Page access</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PAGES.map(page => (
                      <div key={page.key} className="flex items-center justify-between">
                        <span className="text-sm">{page.label}</span>
                        <Switch
                          checked={p.page_access[page.key] !== false}
                          onCheckedChange={(v) => savePermission(m.userId, {
                            ...p,
                            page_access: { ...p.page_access, [page.key]: v },
                          })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dashboard and Calendar are always available.
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
