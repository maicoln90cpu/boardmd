import { Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostTheme } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  itemCount: number;
  converted: Record<string, number>;
  onOpen: () => void;
  onDelete: () => void;
}

export function CostThemeCard({ theme, itemCount, converted, onOpen, onDelete }: Props) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={onOpen}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{theme.name}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <span className="text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {theme.currencies.map((c) => (
              <span key={c.code} className={c.code === theme.base_currency ? "font-bold text-primary" : "text-foreground"}>
                {(converted[c.code] || 0).toFixed(2)} {c.code}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {theme.currencies.map((c) => (
            <span key={c.code} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {c.code}
            </span>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
