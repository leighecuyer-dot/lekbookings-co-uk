import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { useResellerOperations } from "@/hooks/reseller";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone, User, MoreHorizontal, Lock, Settings2, Upload, Users } from "lucide-react";
import { getPrivacySettings } from "@/components/settings/PrivacySettings";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { CustomerPreferencesDialog } from "@/components/customers";
import { AssignStaffDialog } from "@/components/customers/AssignStaffDialog";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export default function CustomersPage() {
  const { currentBusiness, isResellerMode } = useBusiness();
  const { createCustomer: resellerCreateCustomer } = useResellerOperations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preferencesCustomer, setPreferencesCustomer] = useState<Customer | null>(null);
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Handle ?action=add query param to auto-open dialog
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setDialogOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (currentBusiness) {
      fetchCustomers();
    }
  }, [currentBusiness]);

  const fetchCustomers = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load customers");
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleCreateCustomer = async () => {
    if (!currentBusiness || !newCustomer.name) {
      toast.error("Please enter a customer name");
      return;
    }

    let success = false;

    if (isResellerMode) {
      // Use SECURITY DEFINER RPC for reseller mode (with audit logging)
      const customerId = await resellerCreateCustomer({
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        notes: newCustomer.notes || null,
      });
      success = !!customerId;
    } else {
      // Normal mode: direct insert
      const { error } = await supabase.from("customers").insert({
        business_id: currentBusiness.id,
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        notes: newCustomer.notes || null,
      });
      success = !error;
      if (error) {
        toast.error("Failed to create customer");
        return;
      }
    }

    if (success) {
      toast.success("Customer added!");
      setDialogOpen(false);
      setNewCustomer({ name: "", email: "", phone: "", notes: "" });
      fetchCustomers();
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete customer");
    } else {
      toast.success("Customer deleted");
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <DashboardLayout
      title="Customers"
      description="Manage your customer database"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/import?tab=customers">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Link>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to your database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newCustomer.notes}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, notes: e.target.value })
                  }
                  placeholder="Any notes about this customer..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateCustomer} className="w-full gradient-primary">
                Add Customer
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No customers found" : "No customers yet"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Customer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="border-0 shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{customer.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setPreferencesCustomer(customer)}
                            >
                              <Settings2 className="w-4 h-4 mr-2" />
                              Contact Preferences
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {(() => {
                        const privacySettings = getPrivacySettings(currentBusiness?.settings as Record<string, unknown> | null);
                        const hideContact = isResellerMode && !privacySettings.share_customer_contact_with_reseller;
                        
                        if (hideContact) {
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="mt-1 gap-1 cursor-help">
                                    <Lock className="w-3 h-3" />
                                    Contact hidden
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px] text-center">
                                  <p className="text-xs">This data is hidden by the business owner's privacy settings.</p>
                                  <Link 
                                    to="/settings" 
                                    className="text-xs text-primary hover:underline mt-1 inline-block"
                                  >
                                    View privacy settings →
                                  </Link>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        }
                        
                        return (
                          <>
                            {customer.email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                {customer.email}
                              </p>
                            )}
                            {customer.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                {customer.phone}
                              </p>
                            )}
                          </>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {format(new Date(customer.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Preferences Dialog */}
      {preferencesCustomer && currentBusiness && (
        <CustomerPreferencesDialog
          open={!!preferencesCustomer}
          onOpenChange={(open) => !open && setPreferencesCustomer(null)}
          customerId={preferencesCustomer.id}
          customerName={preferencesCustomer.name}
          customerEmail={preferencesCustomer.email}
          customerPhone={preferencesCustomer.phone}
          businessId={currentBusiness.id}
        />
      )}
    </DashboardLayout>
  );
}
