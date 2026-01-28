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
import { Plus, Mail, Phone, UserCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export default function StaffPage() {
  const { currentBusiness } = useBusiness();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
  });

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
      setStaffList(data || []);
    }
    setLoading(false);
  };

  const handleCreateStaff = async () => {
    if (!currentBusiness || !newStaff.name) {
      toast.error("Please enter a staff name");
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
      }
    >
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
