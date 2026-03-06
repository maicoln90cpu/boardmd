import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import { CostItemForm } from "./CostItemForm";
import { CostSummary } from "./CostSummary";
import { ExchangeRateEditor } from "./ExchangeRateEditor";
import { CostReportExport } from "./CostReportExport";
import { COST_CATEGORIES, PAYMENT_METHODS, getEffectiveAmount } from "@/hooks/useCostCalculator";
import type { CostTheme, CostItem } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  items: CostItem[];
  totals: { byOriginal: Record<string, number>; converted: Record<string, number>; byCategory: Record<string, number>; ccFees: number; ccIOF: number };
  reportText: string;
  onBack: () => void;
  onAddItem: (item: { description: string; amount: number; currency: string; cost_date: string; category: string; payment_method: string }) => void;
  onDeleteItem: (id: string) => void;
  onUpdateRates: (rates: Record<string, number>) => void;
}

const catLabels: Record<string, string> = Object.fromEntries(COST_CATEGORIES.map(c => [c.value, c.label]));
const pmLabels: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(p => [p.value, p.label]));

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
          {items.map((item) => {
            const isCC = item.payment_method === "credit_card";
            const effective = getEffectiveAmount(Number(item.amount), item.payment_method);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">{catLabels[item.category] || item.category}</Badge>
                    <Badge variant="outline" className="text-xs">{pmLabels[item.payment_method] || item.payment_method}</Badge>
                    {isCC && <Badge variant="destructive" className="text-xs">+16.6% taxas</Badge>}
                    <span className="text-xs text-muted-foreground">{item.cost_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {Number(item.amount).toFixed(2)} {item.currency}
                    </span>
                    {isCC && (
                      <p className="text-xs text-destructive">
                        → {effective.toFixed(2)} {item.currency}
                      </p>
                    )}
                  </div>
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
            );
          })}
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
