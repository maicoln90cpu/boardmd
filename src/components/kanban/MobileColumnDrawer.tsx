import { memo } from "react";
import { Column } from "@/hooks/data/useColumns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { getColumnTopBarClass } from "@/lib/columnStyles";
import { Check } from "lucide-react";

interface MobileColumnDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  currentColumnId: string;
  onSelectColumn: (columnId: string) => void;
}

export const MobileColumnDrawer = memo(function MobileColumnDrawer({
  open,
  onOpenChange,
  columns,
  currentColumnId,
  onSelectColumn,
}: MobileColumnDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Mover para coluna</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-1">
          {columns.map((col) => {
            const isCurrent = col.id === currentColumnId;
            const colorClass = getColumnTopBarClass(col.color);
            return (
              <button
                key={col.id}
                disabled={isCurrent}
                onClick={() => onSelectColumn(col.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "hover:bg-accent active:bg-accent/80",
                )}
              >
                <span className={cn("w-3 h-3 rounded-full shrink-0", colorClass)} />
                <span className="flex-1 text-left font-medium">{col.name}</span>
                {isCurrent && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
});
