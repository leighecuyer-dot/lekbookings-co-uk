import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Mail } from "lucide-react";

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  staffId: string;
  staffName: string;
  staffEmail: string | null;
  linkedUserId: string | null;
  onSaved: () => void;
}

export function StaffAccessModal({
  open, onOpenChange, businessId, staffId, staffName, staffEmail, linkedUserId, onSaved,
}: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string>(linkedUserId ?? "none");
  const [inviteEmail, setInviteEmail] = useState(staffEmail ?? "");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(linkedUserId ?? "none");
    setInviteEmail(staffEmail ?? "");
    setInviteLink(null);
    (async () => {
      const { data, error } = await supabase.rpc("list_business_members", {
        _business_id: businessId,
      });
      if (!error && data) setMembers(data as Member[]);
    })();
  }, [open, businessId, linkedUserId, staffEmail]);

  const handleLink = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("link_staff_to_user", {
      _staff_id: staffId,
      _user_id: selected === "none" ? null : selected,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not link that login");
      return;
    }
    toast.success(selected === "none" ? "Login unlinked" : `Login linked to ${staffName}`);
    onSaved();
    onOpenChange(false);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !user) {
      toast.error("Enter an email address");
      return;
    }
    setBusy(true);
    // Keep the staff record's email in sync so the login auto-links on acceptance.
    await supabase.from("staff").update({ email }).eq("id", staffId);

    const { data, error } = await supabase
      .from("business_invites")
      .insert({ business_id: businessId, email, role: "staff", invited_by: user.id })
      .select("token")
      .maybeSingle();
    setBusy(false);

    if (error) {
      console.error("create invite error:", error);
      toast.error(`Could not create the invite: ${error.message}`);
      return;
    }
    if (!data?.token) {
      toast.error("Invite created but the link could not be read back. Please refresh and try again.");
      return;
    }
    // Preview/editor origins are workspace-restricted — always share the public domain
    const origin = /lovable\.(app|dev)|localhost/.test(window.location.hostname)
      ? "https://lekbookings.co.uk"
      : window.location.origin;
    const link = `${origin}/invite/accept?token=${data.token}`;
    setInviteLink(link);
    toast.success("Invite created — send them the link");
    onSaved();

  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Login access — {staffName}</DialogTitle>
          <DialogDescription>
            Give this team member their own login so their appointments are recognised as theirs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Invite by email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@example.com"
              />
              <Button onClick={handleInvite} disabled={busy} className="shrink-0">
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
            {inviteLink && (
              <div className="rounded-md border p-2 space-y-2">
                <p className="text-xs text-muted-foreground break-all">{inviteLink}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy invite link
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Or link an existing login</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name ? `${m.full_name} — ${m.email}` : m.email} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleLink} disabled={busy} className="w-full">
              Save link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
