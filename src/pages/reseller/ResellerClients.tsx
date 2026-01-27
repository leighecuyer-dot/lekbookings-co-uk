import { useState } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
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
import { Plus, Search, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TIERS = [
  { value: "essential", label: "Essential", price: 2000 },
  { value: "professional", label: "Professional", price: 5900 },
  { value: "enterprise", label: "Enterprise", price: 14900 },
];

export default function ResellerClients() {
  const { reseller, clients, refreshClients } = useReseller();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newClient, setNewClient] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    industry: "",
    tier: "essential",
  });

  const filteredClients = clients.filter(
    (c) =>
      c.business?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.business?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async () => {
    if (!reseller || !newClient.businessName) return;

    setLoading(true);

    // Create the business first
    const slug = newClient.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        name: newClient.businessName,
        slug: `${slug}-${Date.now()}`,
        email: newClient.businessEmail || null,
        phone: newClient.businessPhone || null,
        industry: newClient.industry || null,
      })
      .select()
      .single();

    if (bizError) {
      toast.error("Failed to create business");
      setLoading(false);
      return;
    }

    // Link to reseller
    const tier = TIERS.find((t) => t.value === newClient.tier);
    const markup = reseller.markup_percentage || 0;
    const price = Math.round((tier?.price || 2000) * (1 + markup / 100));

    const { error: linkError } = await supabase.from("reseller_clients").insert({
      reseller_id: reseller.id,
      business_id: business.id,
      subscription_tier: newClient.tier,
      monthly_price: price,
    });

    if (linkError) {
      toast.error("Failed to link client");
      setLoading(false);
      return;
    }

    toast.success("Client added successfully");
    setDialogOpen(false);
    setNewClient({
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      industry: "",
      tier: "essential",
    });
    refreshClients();
    setLoading(false);
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Create a new business account for your client
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
                        <Label>Email</Label>
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
                      <Input
                        value={newClient.industry}
                        onChange={(e) =>
                          setNewClient({ ...newClient, industry: e.target.value })
                        }
                        placeholder="Hair Salon"
                      />
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
                          {TIERS.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label} - £{(tier.price / 100).toFixed(2)}/mo
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full gradient-primary"
                      onClick={handleAddClient}
                      disabled={loading || !newClient.businessName}
                    >
                      {loading ? "Creating..." : "Add Client"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No clients found</p>
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
                      £{(client.monthly_price / 100).toFixed(2)}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              toggleClientStatus(client.id, client.is_active)
                            }
                          >
                            {client.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ResellerLayout>
  );
}
