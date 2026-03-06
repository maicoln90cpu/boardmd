import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight } from "lucide-react";
import type { CostTheme } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  itemCount: number;
  totalBase: number;
  onOpen: () => void;
  onDelete: () => void;
}

export function CostThemeCard({ theme, itemCount, totalBase, onOpen, onDelete }: Props) {
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
          <span className="font-semibold text-foreground">
            {totalBase.toFixed(2)} {theme.base_currency}
          </span>
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
