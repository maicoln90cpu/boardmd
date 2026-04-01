import { ArrowLeft, Settings2, Trash2, Pencil, Copy } from "lucide-react";
import { useState, useMemo } from "react";
import { CostFiltersBar, EMPTY_FILTERS, DEFAULT_SORT, hasActiveFilters, type CostFilters, type CostSortOption } from "./CostFiltersBar";
import { CostItemEditModal } from "./CostItemEditModal";
import { CostItemForm } from "./CostItemForm";
import { CostReportExport } from "./CostReportExport";
import { CostSummary } from "./CostSummary";
import { ExchangeRateEditor } from "./ExchangeRateEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CostTheme, CostItem } from "@/hooks/useCostCalculator";
import { COST_CATEGORIES, PAYMENT_METHODS, getEffectiveAmount } from "@/hooks/useCostCalculator";
import { useCostCalculator } from "@/hooks/useCostCalculator";
import { formatDateShortBR } from "@/lib/dateUtils";

interface Props {
  theme: CostTheme;
  items: CostItem[];
  totals: { byOriginal: Record<string, number>; converted: Record<string, number>; byCategory: Record<string, number>; ccFees: number; ccIOF: number };
  reportText: string;
  onBack: () => void;
  onAddItem: (item: { description: string; amount: number; currency: string; cost_date: string; cost_time: string; category: string; payment_method: string }) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (updates: { id: string; description: string; amount: number; currency: string; cost_date: string; cost_time: string; category: string; payment_method: string }) => void;
  onUpdateRates: (rates: Record<string, number>) => void;
  onUpdateTheme: (updates: Partial<{ exchange_rates: Record<string, number>; cc_fee_percent: number; cc_iof_percent: number }>) => void;
}

const catLabels: Record<string, string> = Object.fromEntries(COST_CATEGORIES.map(c => [c.value, c.label]));
const pmLabels: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(p => [p.value, p.label]));

function applyFilters(items: CostItem[], filters: CostFilters): CostItem[] {
  return items.filter((item) => {
    if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
    if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(item.payment_method)) return false;
    if (filters.currencies.length > 0 && !filters.currencies.includes(item.currency)) return false;
    if (filters.dateFrom && item.cost_date < filters.dateFrom) return false;
    if (filters.dateTo && item.cost_date > filters.dateTo) return false;
    return true;
  });
}

export function CostThemeDetail({
  theme,
  items,
  totals,
  reportText,
  onBack,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  onUpdateRates,
  onUpdateTheme,
}: Props) {
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [filters, setFilters] = useState<CostFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<CostSortOption>(DEFAULT_SORT);
  const { convertAmount, calculateTotals, generateReportText } = useCostCalculator();

  const filteredItems = useMemo(() => {
    const result = hasActiveFilters(filters) ? applyFilters(items, filters) : [...items];
    result.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.field) {
        case "date": {
          const cmp = `${a.cost_date}T${a.cost_time || "00:00"}`.localeCompare(`${b.cost_date}T${b.cost_time || "00:00"}`);
          return cmp * dir;
        }
        case "amount": return (Number(a.amount) - Number(b.amount)) * dir;
        case "category": return a.category.localeCompare(b.category) * dir;
        case "payment_method": return a.payment_method.localeCompare(b.payment_method) * dir;
        case "description": return a.description.localeCompare(b.description) * dir;
        default: return 0;
      }
    });
    return result;
  }, [items, filters, sort]);

  const filteredTotals = useMemo(
    () => hasActiveFilters(filters) ? calculateTotals(filteredItems, theme) : totals,
    [filteredItems, theme, filters, totals, calculateTotals]
  );

  const filteredReportText = useMemo(
    () => hasActiveFilters(filters) ? generateReportText(theme, filteredItems) : reportText,
    [filteredItems, theme, filters, reportText, generateReportText]
  );

  const getConversions = (amount: number, fromCurrency: string) => {
    return theme.currencies
      .filter((c) => c.code !== fromCurrency)
      .map((c) => {
        const val = convertAmount(amount, fromCurrency, c.code, theme.exchange_rates);
        return val !== null ? `${val.toFixed(2)} ${c.code}` : null;
      })
      .filter(Boolean);
  };

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
          ccFeePercent={theme.cc_fee_percent ?? 10}
          ccIofPercent={theme.cc_iof_percent ?? 6}
          onSave={(rates, ccFee, ccIof) => {
            onUpdateRates(rates);
            onUpdateTheme({ cc_fee_percent: ccFee, cc_iof_percent: ccIof });
            setShowRateEditor(false);
          }}
        />
      )}

      <CostItemForm currencies={theme.currencies} onAdd={onAddItem} />

      <CostFiltersBar filters={filters} onChange={setFilters} currencies={theme.currencies} sort={sort} onSortChange={setSort} />

      {hasActiveFilters(filters) && (
        <p className="text-xs text-muted-foreground">
          Mostrando {filteredItems.length} de {items.length} itens
        </p>
      )}

      {filteredItems.length > 0 && (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isCC = item.payment_method === "credit_card";
            const effective = getEffectiveAmount(Number(item.amount), item.payment_method, theme.cc_fee_percent, theme.cc_iof_percent);
            const timeStr = item.cost_time ? ` ${item.cost_time.slice(0, 5)}` : "";
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
                    {isCC && <Badge variant="destructive" className="text-xs">+{(((1 + (theme.cc_fee_percent ?? 10) / 100) * (1 + (theme.cc_iof_percent ?? 6) / 100) - 1) * 100).toFixed(1)}% taxas</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {formatDateShortBR(item.cost_date + "T12:00:00")}{timeStr}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {Number(item.amount).toFixed(2)} {item.currency}
                    </span>
                    {isCC && (
                      <p className="text-xs text-destructive">
                        → {effective.toFixed(2)} {item.currency}
                      </p>
                    )}
                    {theme.currencies.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {getConversions(effective, item.currency).join(" | ")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Duplicar"
                    onClick={() => onAddItem({
                      description: item.description,
                      amount: Number(item.amount),
                      currency: item.currency,
                      cost_date: item.cost_date,
                      cost_time: item.cost_time || "12:00",
                      category: item.category,
                      payment_method: item.payment_method,
                    })}
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingItem(item)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
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

      {filteredItems.length > 0 && (
        <>
          <CostSummary theme={theme} totals={filteredTotals} />
          <CostReportExport
            theme={theme}
            items={filteredItems}
            totals={filteredTotals}
            reportText={filteredReportText}
          />
        </>
      )}

      {editingItem && (
        <CostItemEditModal
          item={editingItem}
          currencies={theme.currencies}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={onUpdateItem}
        />
      )}
    </div>
  );
}
