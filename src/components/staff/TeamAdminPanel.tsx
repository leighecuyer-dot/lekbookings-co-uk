import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Mail, Save, ShieldCheck } from "lucide-react";

type AppRole = "owner" | "admin" | "staff" | "readonly";

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "owner", label: "Owner — full access" },
  { value: "admin", label: "Admin — everything except ownership" },
  { value: "staff", label: "Staff — own bookings" },
  { value: "readonly", label: "View only" },
];

interface StaffRow {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
}

interface Props {
  businessId: string;
  staffList: StaffRow[];
  onChanged: () => void;
}

interface InviteRow {
  email: string;
  role: AppRole;
  token: string;
  accepted_at: string | null;
  expires_at: string;
}

const INVITE_BASE = "https://lekbookings.co.uk";

export function TeamAdminPanel({ businessId, staffList, onChanged }: Props) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [invites, setInvites] = useState<Record<string, InviteRow>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [pendingRole, setPendingRole] = useState<Record<string, AppRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: roleRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").eq("business_id", businessId),
      supabase
        .from("business_invites")
        .select("email, role, token, accepted_at, expires_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
    ]);

    const roleMap: Record<string, AppRole> = {};
    (roleRows || []).forEach((r) => {
      roleMap[r.user_id] = r.role as AppRole;
    });
    setRoles(roleMap);

    const inviteMap: Record<string, InviteRow> = {};
    (inviteRows || []).forEach((i) => {
      const key = (i.email || "").toLowerCase();
      if (!inviteMap[key]) inviteMap[key] = i as InviteRow;
    });
    setInvites(inviteMap);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEmails(Object.fromEntries(staffList.map((s) => [s.id, s.email ?? ""])));
  }, [staffList]);

  const saveEmail = async (staff: StaffRow) => {
    const email = (emails[staff.id] ?? "").trim().toLowerCase();
    setBusyId(staff.id);
    const { error } = await supabase.from("staff").update({ email: email || null }).eq("id", staff.id);
    setBusyId(null);
    if (error) {
      toast.error("Could not save that email address");
      return;
    }
    toast.success("Email saved");
    onChanged();
  };

  const changeRole = async (staff: StaffRow, role: AppRole) => {
    if (!staff.user_id) return;
    setBusyId(staff.id);
    // Single atomic upsert — never leaves the user without a role if it fails.
    const { error } = await supabase.from("user_roles").upsert(
      {
        business_id: businessId,
        user_id: staff.user_id,
        role,
      },
      { onConflict: "user_id,business_id" }
    );
    setBusyId(null);
    if (error) {
      toast.error("Could not change access level — their previous access is unchanged");
      load(); // re-sync displayed roles with the database
      return;
    }
    setRoles((prev) => ({ ...prev, [staff.user_id as string]: role }));
    toast.success(`${staff.name} is now ${role}`);
  };

  const sendInvite = async (staff: StaffRow) => {
    const email = (emails[staff.id] ?? "").trim().toLowerCase();
    if (!email) {
      toast.error("Add an email address first");
      return;
    }
    if (!user) return;
    const role = pendingRole[staff.id] ?? "staff";

    setBusyId(staff.id);
    await supabase.from("staff").update({ email }).eq("id", staff.id);
    const { data, error } = await supabase
      .from("business_invites")
      .insert({ business_id: businessId, email, role, invited_by: user.id })
      .select("email, role, token, accepted_at, expires_at")
      .maybeSingle();
    setBusyId(null);

    if (error || !data?.token) {
      toast.error(error?.message ?? "Could not create the invite link");
      return;
    }
    setInvites((prev) => ({ ...prev, [email]: data as InviteRow }));
    copyLink(data.token);
    onChanged();
  };

  const copyLink = (token: string) => {
    const link = `${INVITE_BASE}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied — paste it to them");
  };

  return (
    <Card className="border-0 shadow-soft mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4" />
          Team access
        </CardTitle>
        <CardDescription>
          Edit email addresses, set what each person can see, and send their invite link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {staffList.length === 0 && (
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        )}
        {staffList.map((staff) => {
          const email = (emails[staff.id] ?? "").trim().toLowerCase();
          const invite = email ? invites[email] : undefined;
          const currentRole = staff.user_id ? roles[staff.user_id] : undefined;
          const accepted = !!invite?.accepted_at;
          const expired = invite ? new Date(invite.expires_at) < new Date() : false;
          const busy = busyId === staff.id;

          return (
            <div
              key={staff.id}
              className="rounded-lg border p-3 space-y-3 md:flex md:items-center md:gap-3 md:space-y-0"
            >
              <div className="md:w-40 shrink-0">
                <p className="font-medium truncate">{staff.name}</p>
                <div className="mt-1">
                  {staff.user_id ? (
                    <Badge variant="outline" className="text-xs">
                      {currentRole ? currentRole : "Login linked"}
                    </Badge>
                  ) : accepted ? (
                    <Badge variant="outline" className="text-xs">Invite accepted</Badge>
                  ) : invite && !expired ? (
                    <Badge variant="secondary" className="text-xs">Invite pending</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">No login</Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 flex gap-2">
                <Input
                  type="email"
                  value={emails[staff.id] ?? ""}
                  placeholder="name@example.com"
                  onChange={(e) => setEmails((prev) => ({ ...prev, [staff.id]: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  onClick={() => saveEmail(staff)}
                  aria-label={`Save email for ${staff.name}`}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>

              <div className="md:w-48 shrink-0">
                <Select
                  value={staff.user_id ? currentRole ?? "staff" : pendingRole[staff.id] ?? "staff"}
                  onValueChange={(v) => {
                    const role = v as AppRole;
                    if (staff.user_id) changeRole(staff, role);
                    else setPendingRole((prev) => ({ ...prev, [staff.id]: role }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button variant="outline" disabled={busy} onClick={() => sendInvite(staff)}>
                  <Mail className="w-4 h-4 mr-2" />
                  {invite && !accepted && !expired ? "New link" : "Invite"}
                </Button>
                {invite && !accepted && !expired && (
                  <Button variant="ghost" size="icon" onClick={() => copyLink(invite.token)} aria-label="Copy invite link">
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
