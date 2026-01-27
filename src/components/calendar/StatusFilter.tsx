import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface StatusFilterProps {
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
}

const statuses = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export function StatusFilter({ selectedStatuses, onStatusChange }: StatusFilterProps) {
  const handleToggle = (statusId: string) => {
    if (statusId === "all") {
      onStatusChange([]);
      return;
    }

    if (selectedStatuses.includes(statusId)) {
      onStatusChange(selectedStatuses.filter((s) => s !== statusId));
    } else {
      onStatusChange([...selectedStatuses, statusId]);
    }
  };

  const isAllSelected = selectedStatuses.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const isSelected =
          status.id === "all" ? isAllSelected : selectedStatuses.includes(status.id);

        return (
          <Button
            key={status.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => handleToggle(status.id)}
            className={`rounded-full ${
              isSelected ? "bg-foreground text-background" : ""
            }`}
          >
            {isSelected && <Check className="w-3 h-3 mr-1" />}
            {status.label}
          </Button>
        );
      })}
    </div>
  );
}
