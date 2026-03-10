import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Search, MoreHorizontal, Building2, Mail, Settings, UserPlus, Crown, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import { useIndustries } from "@/hooks/business";
import { InviteUserDialog } from "@/components/reseller/InviteUserDialog";
import { ChangeTierDialog, SUBSCRIPTION_TIERS } from "@/components/reseller/ChangeTierDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Use shared tier configuration from ChangeTierDialog

export default function ResellerClients() {
  const navigate = useNavigate();
  const { reseller, clients, refreshClients, loading: resellerLoading } = useReseller();
  const { enterResellerMode } = useBusiness();
  const { industries } = useIndustries();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; tier: string | null; clientId: string } | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [newClient, setNewClient] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    industry: "",
    tier: "essential",
    ownerEmail: "",
  });

  const filteredClients = clients.filter(
    (c) =>
      c.business?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.business?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleManageClient = (businessId: string) => {
    enterResellerMode(businessId);
    navigate("/dashboard");
  };

  const handleInviteUsers = (businessId: string, businessName: string, tier: string | null, clientId: string) => {
    setSelectedClient({ id: businessId, name: businessName, tier, clientId });
    setInviteDialogOpen(true);
  };

  const handleChangeTier = (businessId: string, businessName: string, currentTier: string | null, clientId: string) => {
    setSelectedClient({ id: businessId, name: businessName, tier: currentTier, clientId });
    setTierDialogOpen(true);
  };

  const handleAddClient = async () => {
    if (!reseller || !newClient.businessName) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_reseller_client_business", {
        _business_name: newClient.businessName,
        _business_email: newClient.businessEmail || null,
        _business_phone: newClient.businessPhone || null,
        _industry: newClient.industry || null,
        _subscription_tier: newClient.tier,
        _owner_email: newClient.ownerEmail || null,
      });

      if (error) {
        console.error("create_reseller_client_business error:", error);
        if (error.message.includes("not_a_reseller")) {
          toast.error("You are not authorized as a reseller");
        } else {
          toast.error("Failed to create client business");
        }
        setLoading(false);
        return;
      }

      const result = data as {
        success: boolean;
        business_id: string;
        business_slug: string;
        invite_id: string | null;
        invite_token: string | null;
        invite_email: string | null;
      };

      if (result.invite_token) {
        const inviteUrl = `https://lekbookings.co.uk/invite/accept?token=${result.invite_token}`;
        setCreatedInviteUrl(inviteUrl);
        setLinkCopied(false);
        toast.success("Client created! Copy the invite link below to send to your client.");
      } else {
        toast.success("Client created successfully");
        setDialogOpen(false);
      }

      setNewClient({
        businessName: "",
        businessEmail: "",
        businessPhone: "",
        industry: "",
        tier: "essential",
        ownerEmail: "",
      });
      refreshClients();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("reseller_clients")
      .update({ is_active: !currentStatus })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Client ${!currentStatus ? "activated" : "deactivated"}`);
      refreshClients();
    }
  };

  return (
    <ResellerLayout
      title="Clients"
      description="Manage your white-label client businesses"
    >
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle>Client Businesses</CardTitle>
              <CardDescription>
                {clients.length} total clients
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreatedInviteUrl(null); }}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Create a new business account for your client. Optionally invite an owner.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Business Name *</Label>
                      <Input
                        value={newClient.businessName}
                        onChange={(e) =>
                          setNewClient({ ...newClient, businessName: e.target.value })
                        }
                        placeholder="Acme Salon"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Business Email</Label>
                        <Input
                          type="email"
                          value={newClient.businessEmail}
                          onChange={(e) =>
                            setNewClient({ ...newClient, businessEmail: e.target.value })
                          }
                          placeholder="contact@acme.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={newClient.businessPhone}
                          onChange={(e) =>
                            setNewClient({ ...newClient, businessPhone: e.target.value })
                          }
                          placeholder="+44 123 456 7890"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={newClient.industry}
                        onValueChange={(v) => setNewClient({ ...newClient, industry: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subscription Tier</Label>
                      <Select
                        value={newClient.tier}
                        onValueChange={(v) => setNewClient({ ...newClient, tier: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_TIERS.filter(t => t.value !== "free").map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label} - £{(tier.price / 100).toFixed(2)}/mo
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Owner Invite Section */}
                    <div className="border-t pt-4 mt-4">
                      <Label className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        Owner Email (Optional)
                      </Label>
                      <Input
                        type="email"
                        value={newClient.ownerEmail}
                        onChange={(e) =>
                          setNewClient({ ...newClient, ownerEmail: e.target.value })
                        }
                        placeholder="owner@acme.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The owner will receive an invite to access and manage this business.
                      </p>
                    </div>
                    
                    <Button
                      className="w-full gradient-primary"
                      onClick={handleAddClient}
                      disabled={loading || !newClient.businessName}
                    >
                      {loading ? "Creating..." : "Add Client"}
                    </Button>

                    {createdInviteUrl && (
                      <Alert className="bg-muted/50">
                        <AlertDescription className="space-y-2">
                          <p className="text-sm font-medium">✅ Client created! Send this link to your client:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-background p-2 rounded border overflow-x-auto whitespace-nowrap">
                              {createdInviteUrl}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(createdInviteUrl);
                                setLinkCopied(true);
                                toast.success("Link copied to clipboard!");
                                setTimeout(() => setLinkCopied(false), 2000);
                              }}
                            >
                              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            They'll use this link to create their account and access the business.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resellerLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredClients.length === 0 && clients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No clients yet"
              description="Add your first client business to start managing their accounts and earning revenue."
              action={{
                label: "Add First Client",
                onClick: () => setDialogOpen(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No clients match your search</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.business?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.business?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{client.business?.industry || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {client.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        £{((client.monthly_price || 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={client.is_active ? "default" : "secondary"}
                          className={client.is_active ? "bg-green-500" : ""}
                        >
                          {client.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => client.business?.id && handleManageClient(client.business.id)}
                            className="gap-1"
                          >
                            <Settings className="h-3 w-3" />
                            Manage
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => client.business?.id && handleManageClient(client.business.id)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Business
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  client.business?.id &&
                                  handleInviteUsers(client.business.id, client.business.name || "Business", client.subscription_tier, client.id)
                                }
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite Users
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  client.business?.id &&
                                  handleChangeTier(client.business.id, client.business.name || "Business", client.subscription_tier, client.id)
                                }
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                Change Tier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleClientStatus(client.id, client.is_active ?? true)
                                }
                              >
                                {client.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Users Dialog */}
      {selectedClient && (
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          businessId={selectedClient.id}
          businessName={selectedClient.name}
        />
      )}

      {/* Change Tier Dialog */}
      {selectedClient && (
        <ChangeTierDialog
          open={tierDialogOpen}
          onOpenChange={setTierDialogOpen}
          clientId={selectedClient.clientId}
          businessName={selectedClient.name}
          currentTier={selectedClient.tier}
          onSuccess={refreshClients}
        />
      )}
    </ResellerLayout>
  );
}
