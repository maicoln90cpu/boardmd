import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import { CostItemForm } from "./CostItemForm";
import { CostSummary } from "./CostSummary";
import { ExchangeRateEditor } from "./ExchangeRateEditor";
import { CostReportExport } from "./CostReportExport";
import type { CostTheme, CostItem } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  items: CostItem[];
  totals: { byOriginal: Record<string, number>; converted: Record<string, number> };
  reportText: string;
  onBack: () => void;
  onAddItem: (item: { description: string; amount: number; currency: string; cost_date: string }) => void;
  onDeleteItem: (id: string) => void;
  onUpdateRates: (rates: Record<string, number>) => void;
}

export function CostThemeDetail({
  theme,
  items,
  totals,
  reportText,
  onBack,
  onAddItem,
  onDeleteItem,
  onUpdateRates,
}: Props) {
  const [showRateEditor, setShowRateEditor] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold flex-1">{theme.name}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRateEditor(!showRateEditor)}
          className="gap-1"
        >
          <Settings2 className="h-4 w-4" /> Câmbio
        </Button>
      </div>

      {showRateEditor && (
        <ExchangeRateEditor
          currencies={theme.currencies}
          exchangeRates={theme.exchange_rates}
          onSave={(rates) => {
            onUpdateRates(rates);
            setShowRateEditor(false);
          }}
        />
      )}

      <CostItemForm currencies={theme.currencies} onAdd={onAddItem} />

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground">{item.cost_date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold whitespace-nowrap">
                  {Number(item.amount).toFixed(2)} {item.currency}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDeleteItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <CostSummary theme={theme} totals={totals} />
          <CostReportExport
            theme={theme}
            items={items}
            totals={totals}
            reportText={reportText}
          />
        </>
      )}
    </div>
  );
}
