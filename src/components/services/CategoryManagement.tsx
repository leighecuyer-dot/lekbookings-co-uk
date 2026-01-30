import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface CategoryManagementProps {
  businessId: string;
  categories: ServiceCategory[];
  onCategoriesChange: () => void;
}

export function CategoryManagement({
  businessId,
  categories,
  onCategoriesChange,
}: CategoryManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const maxOrder = Math.max(...categories.map((c) => c.display_order), 0);

    const { error } = await supabase.from("service_categories").insert({
      business_id: businessId,
      name: newCategory.name.trim(),
      description: newCategory.description.trim() || null,
      display_order: maxOrder + 1,
    });

    if (error) {
      toast.error("Failed to create category");
      return;
    }

    toast.success("Category created!");
    setDialogOpen(false);
    setNewCategory({ name: "", description: "" });
    onCategoriesChange();
  };

  const handleEditClick = (category: ServiceCategory) => {
    setEditingCategory(category);
    setEditForm({
      name: category.name,
      description: category.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editForm.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const { error } = await supabase
      .from("service_categories")
      .update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      })
      .eq("id", editingCategory.id);

    if (error) {
      toast.error("Failed to update category");
      return;
    }

    toast.success("Category updated!");
    setEditDialogOpen(false);
    setEditingCategory(null);
    onCategoriesChange();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
      return;
    }

    toast.success("Category deleted");
    onCategoriesChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Categories
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  placeholder="e.g., Hair Services"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>
              <Button onClick={handleCreateCategory} className="w-full gradient-primary">
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create one to organize your services.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="px-3 py-1.5 flex items-center gap-2"
            >
              {category.name}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 hover:bg-muted rounded p-0.5">
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditClick(category)}>
                    <Pencil className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Badge>
          ))}
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="e.g., Hair Services"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <Button onClick={handleUpdateCategory} className="w-full gradient-primary">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
