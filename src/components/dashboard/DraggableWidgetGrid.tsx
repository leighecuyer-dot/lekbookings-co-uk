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
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WIDGET_ORDER_KEY = "dashboard-widget-order";
const WIDGET_SIZES_KEY = "dashboard-widget-sizes";

export type WidgetId = "availability" | "performance" | "revenue" | "trends";
export type WidgetSize = 1 | 2 | 3; // Column spans

interface Widget {
  id: WidgetId;
  render: () => ReactNode;
  visible: boolean;
}

interface SortableWidgetProps {
  id: WidgetId;
  children: ReactNode;
  className?: string;
  size: WidgetSize;
  onResize: (size: WidgetSize) => void;
  maxSize?: WidgetSize;
}

function SortableWidget({ id, children, className, size, onResize, maxSize = 3 }: SortableWidgetProps) {
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

  const canExpand = size < maxSize;
  const canShrink = size > 1;

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canExpand) {
      onResize((size + 1) as WidgetSize);
    }
  };

  const handleShrink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canShrink) {
      onResize((size - 1) as WidgetSize);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-90",
        size === 2 && "md:col-span-2",
        size === 3 && "md:col-span-2 lg:col-span-3",
        className
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none z-10 hidden sm:flex"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Resize controls */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <TooltipProvider delayDuration={300}>
          {canShrink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                  onClick={handleShrink}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Shrink widget
              </TooltipContent>
            </Tooltip>
          )}
          {canExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                  onClick={handleExpand}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Expand widget
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>

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

export function useWidgetSizes() {
  const [sizes, setSizes] = useState<Record<WidgetId, WidgetSize>>(() => {
    try {
      const stored = localStorage.getItem(WIDGET_SIZES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return {
      availability: 1,
      performance: 1,
      revenue: 1,
      trends: 3,
    };
  });

  useEffect(() => {
    localStorage.setItem(WIDGET_SIZES_KEY, JSON.stringify(sizes));
  }, [sizes]);

  const setSize = (id: WidgetId, size: WidgetSize) => {
    setSizes((prev) => ({ ...prev, [id]: size }));
  };

  return { sizes, setSize };
}

interface DraggableWidgetGridProps {
  widgets: Widget[];
  order: WidgetId[];
  onReorder: (activeId: WidgetId, overId: WidgetId) => void;
  sizes: Record<WidgetId, WidgetSize>;
  onResize: (id: WidgetId, size: WidgetSize) => void;
  className?: string;
}

export function DraggableWidgetGrid({
  widgets,
  order,
  onReorder,
  sizes,
  onResize,
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
              <SortableWidget
                key={widget.id}
                id={widget.id}
                size={sizes[widget.id] || 1}
                onResize={(size) => onResize(widget.id, size)}
                maxSize={3}
              >
                {widget.render()}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      )}
      {trendsWidget && (
        <SortableContext items={[trendsWidget.id]} strategy={rectSortingStrategy}>
          <SortableWidget
            id={trendsWidget.id}
            className="mt-3 sm:mt-6"
            size={sizes[trendsWidget.id] || 3}
            onResize={(size) => onResize(trendsWidget.id, size)}
            maxSize={3}
          >
            {trendsWidget.render()}
          </SortableWidget>
        </SortableContext>
      )}
    </DndContext>
  );
}
