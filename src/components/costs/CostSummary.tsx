import { COST_CATEGORIES } from "@/hooks/useCostCalculator";
import type { CostTheme } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  totals: { byOriginal: Record<string, number>; converted: Record<string, number>; byCategory: Record<string, number>; ccFees: number; ccIOF: number };
}

const catLabels: Record<string, string> = Object.fromEntries(COST_CATEGORIES.map(c => [c.value, c.label]));

export function CostSummary({ theme, totals }: Props) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Resumo de Custos
      </h3>

      {/* By category */}
      {Object.keys(totals.byCategory).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Por categoria:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(totals.byCategory).map(([cat, val]) => (
              <div key={cat} className="text-sm">
                <span className="font-medium">{val.toFixed(2)}</span>{" "}
                <span className="text-muted-foreground">{catLabels[cat] || cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(totals.byOriginal).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Por moeda (c/ taxas):</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(totals.byOriginal).map(([code, val]) => (
              <div key={code} className="text-sm">
                <span className="font-medium">{val.toFixed(2)}</span>{" "}
                <span className="text-muted-foreground">{code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit card fees */}
      {(totals.ccFees > 0 || totals.ccIOF > 0) && (
        <div className="rounded-md bg-destructive/10 p-3 space-y-1">
          <p className="text-xs font-semibold text-destructive">💳 Taxas Cartão de Crédito:</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Taxa 10%: <strong>{totals.ccFees.toFixed(2)}</strong></span>
            <span>IOF 6%: <strong>{totals.ccIOF.toFixed(2)}</strong></span>
            <span>Total taxas: <strong>{(totals.ccFees + totals.ccIOF).toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-1">Totais convertidos:</p>
        <div className="flex flex-wrap gap-4">
          {theme.currencies.map((c) => (
            <div
              key={c.code}
              className={`text-sm ${c.code === theme.base_currency ? "text-primary font-bold" : ""}`}
            >
              <span className="font-medium">{(totals.converted[c.code] || 0).toFixed(2)}</span>{" "}
              <span className="text-muted-foreground">{c.code}</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(theme.exchange_rates).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Câmbios:</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {Object.entries(theme.exchange_rates).map(([key, val]) => {
              const [from, to] = key.split("_");
              return (
                <span key={key}>
                  1 {from} = {val} {to}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
