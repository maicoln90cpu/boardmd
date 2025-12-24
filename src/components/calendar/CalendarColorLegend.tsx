import { useState } from "react";
import { ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Column {
  id: string;
  name: string;
  color: string | null;
}

interface CalendarColorLegendProps {
  columns: Column[];
  className?: string;
}

export function CalendarColorLegend({ columns, className }: CalendarColorLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filtrar apenas colunas com cor definida
  const columnsWithColor = columns.filter(col => col.color);
  
  if (columnsWithColor.length === 0) {
    return null;
  }

  return (
    <div className={cn("", className)}>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          <span className="font-medium">Status:</span>
        </div>
        {columnsWithColor.map((column) => (
          <div
            key={column.id}
            className="flex items-center gap-1.5 text-xs"
          >
            <div
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: column.color || undefined }}
            />
            <span className="text-muted-foreground whitespace-nowrap">
              {column.name}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile: collapsible */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Legenda</span>
            {isOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-2 pb-2">
            {columnsWithColor.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: column.color || undefined }}
                />
                <span className="text-muted-foreground whitespace-nowrap">
                  {column.name}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
