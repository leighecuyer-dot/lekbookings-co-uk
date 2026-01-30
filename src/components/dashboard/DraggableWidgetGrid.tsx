import { ReactNode, useState, useEffect } from "react";
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
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDGET_ORDER_KEY = "dashboard-widget-order";

export type WidgetId = "availability" | "performance" | "revenue" | "trends";

interface Widget {
  id: WidgetId;
  render: () => ReactNode;
  visible: boolean;
}

interface SortableWidgetProps {
  id: WidgetId;
  children: ReactNode;
  className?: string;
}

function SortableWidget({ id, children, className }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90",
        className
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none z-10 hidden sm:flex"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

export function useWidgetOrder() {
  const [order, setOrder] = useState<WidgetId[]>(() => {
    try {
      const stored = localStorage.getItem(WIDGET_ORDER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return ["availability", "performance", "revenue", "trends"];
  });

  useEffect(() => {
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
  }, [order]);

  const reorder = (activeId: WidgetId, overId: WidgetId) => {
    setOrder((items) => {
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return { order, reorder };
}

interface DraggableWidgetGridProps {
  widgets: Widget[];
  order: WidgetId[];
  onReorder: (activeId: WidgetId, overId: WidgetId) => void;
  className?: string;
}

export function DraggableWidgetGrid({
  widgets,
  order,
  onReorder,
  className,
}: DraggableWidgetGridProps) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as WidgetId, over.id as WidgetId);
    }
  };

  // Sort widgets by order and filter visible ones
  const sortedWidgets = order
    .map((id) => widgets.find((w) => w.id === id))
    .filter((w): w is Widget => w !== undefined && w.visible);

  if (sortedWidgets.length === 0) return null;

  // Check if this is the grid (first 3 widgets) or just trends
  const isGridLayout = sortedWidgets.some((w) =>
    ["availability", "performance", "revenue"].includes(w.id)
  );
  const gridWidgets = sortedWidgets.filter((w) =>
    ["availability", "performance", "revenue"].includes(w.id)
  );
  const trendsWidget = sortedWidgets.find((w) => w.id === "trends");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {gridWidgets.length > 0 && (
        <SortableContext items={gridWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className={cn("grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
            {gridWidgets.map((widget) => (
              <SortableWidget key={widget.id} id={widget.id}>
                {widget.render()}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      )}
      {trendsWidget && (
        <SortableContext items={[trendsWidget.id]} strategy={rectSortingStrategy}>
          <SortableWidget id={trendsWidget.id} className="mt-3 sm:mt-6">
            {trendsWidget.render()}
          </SortableWidget>
        </SortableContext>
      )}
    </DndContext>
  );
}
