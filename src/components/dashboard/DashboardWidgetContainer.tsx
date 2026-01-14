import { useState, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  component: React.ReactNode;
}

interface SortableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
}

function SortableWidget({ widget, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!widget.enabled) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-80"
      )}
    >
      {/* Drag handle */}
      <button
        className="absolute -left-2 top-4 z-10 p-1.5 rounded-md bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

interface WidgetConfigItemProps {
  widget: DashboardWidget;
  onToggle: (id: string) => void;
}

function WidgetConfigItem({ widget, onToggle }: WidgetConfigItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card",
        isDragging && "shadow-lg opacity-90"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium">{widget.name}</span>
      </div>
      <Switch
        checked={widget.enabled}
        onCheckedChange={() => onToggle(widget.id)}
      />
    </div>
  );
}

interface DashboardWidgetContainerProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
}

export function DashboardWidgetContainer({ widgets, onWidgetsChange }: DashboardWidgetContainerProps) {
  const [configOpen, setConfigOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      onWidgetsChange(newWidgets);
    }
  }, [widgets, onWidgetsChange]);

  const handleToggleWidget = useCallback((id: string) => {
    const newWidgets = widgets.map((w) =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    onWidgetsChange(newWidgets);
  }, [widgets, onWidgetsChange]);

  const enabledWidgets = widgets.filter((w) => w.enabled);
  const enabledCount = enabledWidgets.length;

  return (
    <div className="relative">
      {/* Config button */}
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="absolute -top-12 right-0 gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Personalizar
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Personalizar Dashboard</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Arraste para reordenar e ative/desative widgets
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={widgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <WidgetConfigItem
                      key={widget.id}
                      widget={widget}
                      onToggle={handleToggleWidget}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {enabledCount} de {widgets.length} widgets ativos
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Widgets grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {widgets.map((widget) => (
              <SortableWidget key={widget.id} widget={widget}>
                {widget.component}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
