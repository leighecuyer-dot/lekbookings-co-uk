import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Briefcase, Sparkles } from "lucide-react";
import { AiServiceImportDialog } from "@/components/services/AiServiceImportDialog";
import { SortableServiceCard } from "@/components/services/SortableServiceCard";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export default function ServicesPage() {
  const { currentBusiness } = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    duration: "30",
    price: "",
    color: COLORS[0],
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    duration: "30",
    price: "",
    color: COLORS[0],
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
      fetchServices();
    }
  }, [currentBusiness]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchServices = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load services");
    } else {
      setServices((data || []) as Service[]);
    }
    setLoading(false);
  };

  const handleCreateService = async () => {
    if (!currentBusiness || !newService.name) {
      toast.error("Please enter a service name");
      return;
    }

    const { error } = await supabase.from("services").insert({
      business_id: currentBusiness.id,
      name: newService.name,
      description: newService.description || null,
      duration_minutes: parseInt(newService.duration) || 30,
      price: newService.price ? parseFloat(newService.price) : null,
      color: newService.color,
    });

    if (error) {
      toast.error("Failed to create service");
      return;
    }

    toast.success("Service added!");
    setDialogOpen(false);
    setNewService({ name: "", description: "", duration: "30", price: "", color: COLORS[0] });
    fetchServices();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update service");
    } else {
      fetchServices();
    }
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete service");
    } else {
      toast.success("Service deleted");
      fetchServices();
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setEditForm({
      name: service.name,
      description: service.description || "",
      duration: service.duration_minutes.toString(),
      price: service.price?.toString() || "",
      color: service.color || COLORS[0],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingService || !editForm.name) {
      toast.error("Please enter a service name");
      return;
    }

    const { error } = await supabase
      .from("services")
      .update({
        name: editForm.name,
        description: editForm.description || null,
        duration_minutes: parseInt(editForm.duration) || 30,
        price: editForm.price ? parseFloat(editForm.price) : null,
        color: editForm.color,
      })
      .eq("id", editingService.id);

    if (error) {
      toast.error("Failed to update service");
      return;
    }

    toast.success("Service updated!");
    setEditDialogOpen(false);
    setEditingService(null);
    fetchServices();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);

      // Update display_order in database
      const updates = newServices.map((service, index) => ({
        id: service.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("services")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Service order updated!");
    }
  };

  return (
    <DashboardLayout
      title="Services"
      description="Manage the services you offer"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAiImportOpen(true)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Import</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
              <DialogDescription>
                Create a new service that customers can book
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Service Name *</Label>
                <Input
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                  placeholder="Haircut"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({ ...newService, description: e.target.value })
                  }
                  placeholder="Describe this service..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({ ...newService, duration: e.target.value })
                    }
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: e.target.value })
                    }
                    placeholder="50.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newService.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewService({ ...newService, color })}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateService} className="w-full gradient-primary">
                Add Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : services.length === 0 ? (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No services yet</p>
            <Button onClick={() => setDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={services.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <SortableServiceCard
                  key={service.id}
                  service={service}
                  onEdit={handleEditClick}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDeleteService}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {currentBusiness && (
        <AiServiceImportDialog
          open={aiImportOpen}
          onOpenChange={setAiImportOpen}
          businessId={currentBusiness.id}
          onImportComplete={fetchServices}
        />
      )}

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the details for this service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Haircut"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Describe this service..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) =>
                    setEditForm({ ...editForm, duration: e.target.value })
                  }
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  placeholder="50.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editForm.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditForm({ ...editForm, color })}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleUpdateService} className="w-full gradient-primary">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
