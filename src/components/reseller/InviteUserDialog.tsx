import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Trash2, UserPlus, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "readonly", label: "Read Only" },
];

export function InviteUserDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingInvites, setFetchingInvites] = useState(false);

  const fetchInvites = async () => {
    setFetchingInvites(true);
    try {
      const { data, error } = await supabase.rpc("reseller_get_business_invites", {
        p_business_id: businessId,
      });

      if (error) {
        console.error("Failed to fetch invites:", error);
        return;
      }

      setInvites((data as Invite[]) || []);
    } catch (err) {
      console.error("Error fetching invites:", err);
    } finally {
      setFetchingInvites(false);
    }
  };

  useEffect(() => {
    if (open && businessId) {
      fetchInvites();
    }
  }, [open, businessId]);

  const handleSendInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("reseller_create_invite", {
        p_business_id: businessId,
        p_email: email.trim(),
        p_role: role as "owner" | "admin" | "staff" | "readonly",
      });

      if (error) {
        console.error("reseller_create_invite error:", error);
        if (error.message.includes("invite_already_pending")) {
          toast.error("An invite is already pending for this email");
        } else if (error.message.includes("reseller_not_linked_to_business")) {
          toast.error("You are not authorized to manage this business");
        } else if (error.message.includes("invalid_email")) {
          toast.error("Please enter a valid email address");
        } else {
          toast.error("Failed to send invite");
        }
        return;
      }

      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setRole("staff");
      fetchInvites();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string, inviteEmail: string) => {
    try {
      const { error } = await supabase.rpc("reseller_revoke_invite", {
        p_invite_id: inviteId,
      });

      if (error) {
        console.error("reseller_revoke_invite error:", error);
        toast.error("Failed to revoke invite");
        return;
      }

      toast.success(`Invite for ${inviteEmail} revoked`);
      fetchInvites();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const pendingInvites = invites.filter((i) => !i.accepted_at);
  const acceptedInvites = invites.filter((i) => i.accepted_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Users to {businessName}
          </DialogTitle>
          <DialogDescription>
            Send account invites to staff members or administrators for this business.
          </DialogDescription>
        </DialogHeader>

        {/* Send New Invite */}
        <div className="space-y-4 border-b pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleSendInvite}
            disabled={loading || !email.trim()}
            className="gradient-primary"
          >
            <Mail className="h-4 w-4 mr-2" />
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-warning" />
              Pending Invites ({pendingInvites.length})
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(invite.expires_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Accepted Invites */}
        {acceptedInvites.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              Accepted ({acceptedInvites.length})
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Accepted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acceptedInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(invite.accepted_at!), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {invites.length === 0 && !fetchingInvites && (
          <p className="text-center text-muted-foreground py-4">
            No invites sent yet for this business.
          </p>
        )}

        {fetchingInvites && (
          <p className="text-center text-muted-foreground py-4">
            Loading invites...
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
