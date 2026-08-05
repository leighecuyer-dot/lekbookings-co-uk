import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
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
import { toast } from "sonner";
import { Plus, Mail, Phone, UserCircle, MoreHorizontal, Clock, Lock, Crown, CalendarDays, DollarSign, Percent, KeyRound, Pencil } from "lucide-react";
import { StaffAccessModal } from "@/components/staff/StaffAccessModal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StaffAvailabilityModal } from "@/components/staff/StaffAvailabilityModal";
import { StaffLeaveModal } from "@/components/staff/StaffLeaveModal";
import { StaffRevenueSettingsModal } from "@/components/staff/StaffRevenueSettingsModal";
import { useSubscriptionTier } from "@/hooks/subscription/useSubscriptionTier";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserPermissions } from "@/hooks/permissions/useUserPermissions";

interface WorkingHours {
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  user_id: string | null;
  working_hours: WorkingHours | null;
  revenue_tracking_enabled: boolean;
  commission_percentage: number;
}


export default function StaffPage() {
  const { currentBusiness } = useBusiness();
  const { canViewFinancials } = useUserPermissions(currentBusiness?.id);
  const { tier, limits, canAddStaff, loading: tierLoading } = useSubscriptionTier(currentBusiness?.id ?? null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedStaffForAvailability, setSelectedStaffForAvailability] = useState<Staff | null>(null);
  const [selectedStaffForLeave, setSelectedStaffForLeave] = useState<Staff | null>(null);
  const [selectedStaffForRevenue, setSelectedStaffForRevenue] = useState<Staff | null>(null);
  const [selectedStaffForAccess, setSelectedStaffForAccess] = useState<Staff | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
  });


  const staffLimitReached = !canAddStaff(staffList.length);

  useEffect(() => {
    if (currentBusiness) {
      fetchStaff();
    }
  }, [currentBusiness]);

  const fetchStaff = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load staff");
    } else {
      // Map the data to our Staff interface with proper typing
      const mappedStaff: Staff[] = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        is_active: s.is_active,
        user_id: s.user_id ?? null,

        working_hours: s.working_hours as unknown as WorkingHours | null,
        revenue_tracking_enabled: s.revenue_tracking_enabled,
        commission_percentage: s.commission_percentage,
      }));
      setStaffList(mappedStaff);
    }
    setLoading(false);
  };

  const handleCreateStaff = async () => {
    if (!currentBusiness || !newStaff.name) {
      toast.error("Please enter a staff name");
      return;
    }

    // Check staff limit
    if (staffLimitReached) {
      toast.error(`Your ${tier} plan allows up to ${limits.maxStaff} staff member${limits.maxStaff > 1 ? 's' : ''}. Upgrade to add more.`);
      return;
    }

    const { error } = await supabase.from("staff").insert({
      business_id: currentBusiness.id,
      name: newStaff.name,
      email: newStaff.email || null,
      phone: newStaff.phone || null,
    });

    if (error) {
      toast.error("Failed to add staff member");
      return;
    }

    toast.success("Staff member added!");
    setDialogOpen(false);
    setNewStaff({ name: "", email: "", phone: "" });
    fetchStaff();
  };

  const openEditStaff = (staff: Staff) => {
    setEditStaff({
      id: staff.id,
      name: staff.name,
      email: staff.email ?? "",
      phone: staff.phone ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!editStaff) return;
    if (!editStaff.name.trim()) {
      toast.error("Please enter a staff name");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("staff")
      .update({
        name: editStaff.name.trim(),
        email: editStaff.email.trim() || null,
        phone: editStaff.phone.trim() || null,
      })
      .eq("id", editStaff.id);
    setSavingEdit(false);

    if (error) {
      toast.error("Could not save changes");
      return;
    }
    toast.success("Details updated");
    setEditDialogOpen(false);
    setEditStaff(null);
    fetchStaff();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("staff")
      .update({ is_active: !isActive })
      .eq("id", id);


    if (error) {
      toast.error("Failed to update staff");
    } else {
      fetchStaff();
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete staff member");
    } else {
      toast.success("Staff member removed");
      fetchStaff();
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <DashboardLayout
      title="Staff"
      description="Manage your team members"
      actions={
        staffLimitReached ? (
          <Button variant="outline" className="gap-2" disabled>
            <Lock className="w-4 h-4" />
            Staff Limit Reached
          </Button>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new team member to your business
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, email: e.target.value })
                    }
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <Button onClick={handleCreateStaff} className="w-full gradient-primary">
                  Add Staff Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    >
      {/* Upgrade Alert when limit reached */}
      {staffLimitReached && (
        <Alert className="mb-4 border-primary/20 bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Upgrade to add more staff</AlertTitle>
          <AlertDescription>
            Your {tier} plan includes {limits.maxStaff} staff member{limits.maxStaff > 1 ? 's' : ''}. 
            {tier === "essential" ? " Upgrade to Professional for up to 5 staff members." : " Upgrade to Enterprise for unlimited staff."}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : staffList.length === 0 ? (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-12">
            <UserCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No staff members yet</p>
            <Button onClick={() => setDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff) => (
            <Card
              key={staff.id}
              className={`border-0 shadow-soft ${!staff.is_active ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{staff.name}</h3>
                        {!staff.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditStaff(staff)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaffForAccess(staff);
                              setAccessModalOpen(true);
                            }}
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Login Access
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaffForAvailability(staff);
                              setAvailabilityModalOpen(true);
                            }}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Set Hours
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStaffForLeave(staff);
                              setLeaveModalOpen(true);
                            }}
                          >
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Manage Leave
                          </DropdownMenuItem>
                          {canViewFinancials && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaffForRevenue(staff);
                                setRevenueModalOpen(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Revenue Settings
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleActive(staff.id, staff.is_active)
                            }
                          >
                            {staff.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {staff.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {staff.email}
                      </p>
                    )}
                    {staff.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {staff.phone}
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge variant={staff.user_id ? "outline" : "secondary"} className="text-xs gap-1">
                        <KeyRound className="w-3 h-3" />
                        {staff.user_id ? "Login linked" : "No login"}
                      </Badge>
                    </div>

                    {/* Revenue tracking indicator */}
                    {canViewFinancials && (
                      <div className="flex items-center gap-2 mt-2">
                        {staff.revenue_tracking_enabled ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs gap-1 cursor-help">
                                  <Percent className="w-3 h-3" />
                                  {staff.commission_percentage}%
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Commission rate: {staff.commission_percentage}%</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs gap-1 cursor-help">
                                  <DollarSign className="w-3 h-3" />
                                  No tracking
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Revenue tracking disabled - paid by customers</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Availability Modal */}
      {selectedStaffForAvailability && (
        <StaffAvailabilityModal
          open={availabilityModalOpen}
          onOpenChange={setAvailabilityModalOpen}
          staffId={selectedStaffForAvailability.id}
          staffName={selectedStaffForAvailability.name}
          currentHours={selectedStaffForAvailability.working_hours}
          onSave={fetchStaff}
        />
      )}

      {/* Leave Modal */}
      {selectedStaffForLeave && currentBusiness && (
        <StaffLeaveModal
          open={leaveModalOpen}
          onOpenChange={setLeaveModalOpen}
          staffId={selectedStaffForLeave.id}
          staffName={selectedStaffForLeave.name}
          businessId={currentBusiness.id}
        />
      )}

      {/* Revenue Settings Modal */}
      {selectedStaffForRevenue && (
        <StaffRevenueSettingsModal
          open={revenueModalOpen}
          onOpenChange={setRevenueModalOpen}
          staffId={selectedStaffForRevenue.id}
          staffName={selectedStaffForRevenue.name}
          currentRevenueTrackingEnabled={selectedStaffForRevenue.revenue_tracking_enabled}
          currentCommissionPercentage={selectedStaffForRevenue.commission_percentage}
          onSave={fetchStaff}
        />
      )}

      {/* Login Access Modal */}
      {selectedStaffForAccess && currentBusiness && (
        <StaffAccessModal
          open={accessModalOpen}
          onOpenChange={setAccessModalOpen}
          businessId={currentBusiness.id}
          staffId={selectedStaffForAccess.id}
          staffName={selectedStaffForAccess.name}
          staffEmail={selectedStaffForAccess.email}
          linkedUserId={selectedStaffForAccess.user_id}
          onSaved={fetchStaff}
        />
      )}

    </DashboardLayout>
  );
}
