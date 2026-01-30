import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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
import { Card, CardContent } from "@/components/ui/card";
import { DialogTrigger, Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Briefcase, Sparkles, Search } from "lucide-react";
import { AiServiceImportDialog } from "@/components/services/AiServiceImportDialog";
import { SortableServiceCard } from "@/components/services/SortableServiceCard";
import { ServiceCardOverlay } from "@/components/services/ServiceCardOverlay";
import { CategoryManagement, ServiceCategory } from "@/components/services/CategoryManagement";
import { CategoryFilter } from "@/components/services/CategoryFilter";
import { ServiceFormDialog, ServiceFormData, COLORS } from "@/components/services/ServiceFormDialog";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
  category_id: string | null;
}

const DEFAULT_FORM: ServiceFormData = {
  name: "",
  description: "",
  duration: "30",
  price: "",
  color: COLORS[0],
  categoryId: "none",
};

export default function ServicesPage() {
  const { currentBusiness } = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [newService, setNewService] = useState<ServiceFormData>(DEFAULT_FORM);
  const [editForm, setEditForm] = useState<ServiceFormData>(DEFAULT_FORM);

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
      fetchCategories();
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

  const fetchCategories = async () => {
    if (!currentBusiness) return;

    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to load categories:", error);
    } else {
      setCategories((data || []) as ServiceCategory[]);
    }
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
      category_id: newService.categoryId !== "none" ? newService.categoryId : null,
    });

    if (error) {
      toast.error("Failed to create service");
      return;
    }

    toast.success("Service added!");
    setDialogOpen(false);
    setNewService(DEFAULT_FORM);
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
      categoryId: service.category_id || "none",
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
        category_id: editForm.categoryId !== "none" ? editForm.categoryId : null,
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

  const handleDuplicateService = async (service: Service) => {
    if (!currentBusiness) return;

    const maxOrder = Math.max(...services.map((s) => s.display_order), 0);

    const { error } = await supabase.from("services").insert({
      business_id: currentBusiness.id,
      name: `${service.name} (Copy)`,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      color: service.color,
      category_id: service.category_id,
      display_order: maxOrder + 1,
    });

    if (error) {
      toast.error("Failed to duplicate service");
      return;
    }

    toast.success("Service duplicated!");
    fetchServices();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

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

  const activeService = activeId ? services.find((s) => s.id === activeId) : null;

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory =
        selectedCategoryId === null || service.category_id === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategoryId]);

  // Group services by category for display
  const groupedServices = useMemo(() => {
    if (selectedCategoryId !== null) {
      return [{ category: null, services: filteredServices }];
    }

    const uncategorized: Service[] = [];
    const byCategory = new Map<string, { category: ServiceCategory; services: Service[] }>();

    filteredServices.forEach((service) => {
      if (!service.category_id) {
        uncategorized.push(service);
      } else {
        const category = categories.find((c) => c.id === service.category_id);
        if (category) {
          const existing = byCategory.get(service.category_id);
          if (existing) {
            existing.services.push(service);
          } else {
            byCategory.set(service.category_id, { category, services: [service] });
          }
        } else {
          uncategorized.push(service);
        }
      }
    });

    const result: { category: ServiceCategory | null; services: Service[] }[] = [];
    
    // Sort by category display_order
    const sortedCategories = Array.from(byCategory.values()).sort(
      (a, b) => a.category.display_order - b.category.display_order
    );
    
    sortedCategories.forEach((group) => result.push(group));
    
    if (uncategorized.length > 0) {
      result.push({ category: null, services: uncategorized });
    }

    return result;
  }, [filteredServices, categories, selectedCategoryId]);

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
        <div className="space-y-6">
          {/* Category Management */}
          {currentBusiness && (
            <CategoryManagement
              businessId={currentBusiness.id}
              categories={categories}
              onCategoriesChange={fetchCategories}
            />
          )}

          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <CategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={setSelectedCategoryId}
          />

          {filteredServices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No services found matching your filters
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-8">
                {groupedServices.map((group, index) => (
                  <div key={group.category?.id || "uncategorized"}>
                    {group.category && (
                      <h3 className="text-lg font-semibold mb-4 text-foreground">
                        {group.category.name}
                      </h3>
                    )}
                    {!group.category && categories.length > 0 && groupedServices.length > 1 && (
                      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                        Uncategorized
                      </h3>
                    )}
                    <SortableContext
                      items={group.services.map((s) => s.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {group.services.map((service) => (
                          <SortableServiceCard
                            key={service.id}
                            service={service}
                            onEdit={handleEditClick}
                            onDuplicate={handleDuplicateService}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDeleteService}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                ))}
              </div>
              <DragOverlay>
                {activeService ? <ServiceCardOverlay service={activeService} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}

      {currentBusiness && (
        <AiServiceImportDialog
          open={aiImportOpen}
          onOpenChange={setAiImportOpen}
          businessId={currentBusiness.id}
          onImportComplete={fetchServices}
        />
      )}

      {/* Add Service Dialog */}
      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add New Service"
        description="Create a new service that customers can book"
        formData={newService}
        onFormChange={setNewService}
        onSubmit={handleCreateService}
        submitLabel="Add Service"
        categories={categories}
      />

      {/* Edit Service Dialog */}
      <ServiceFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Service"
        description="Update the details for this service"
        formData={editForm}
        onFormChange={setEditForm}
        onSubmit={handleUpdateService}
        submitLabel="Save Changes"
        categories={categories}
      />
    </DashboardLayout>
  );
}
