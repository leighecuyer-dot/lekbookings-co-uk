import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
  onCategorySelect,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedCategoryId === null ? "default" : "outline"}
        className={cn(
          "cursor-pointer transition-all",
          selectedCategoryId === null && "bg-primary text-primary-foreground"
        )}
        onClick={() => onCategorySelect(null)}
      >
        All Services
      </Badge>
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={selectedCategoryId === category.id ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all",
            selectedCategoryId === category.id && "bg-primary text-primary-foreground"
          )}
          onClick={() => onCategorySelect(category.id)}
        >
          {category.name}
        </Badge>
      ))}
    </div>
  );
}
