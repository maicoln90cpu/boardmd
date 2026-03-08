import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { COST_CATEGORIES, PAYMENT_METHODS, type CostCurrency } from "@/hooks/useCostCalculator";

export interface CostFilters {
  categories: string[];
  paymentMethods: string[];
  currencies: string[];
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: CostFilters = {
  categories: [],
  paymentMethods: [],
  currencies: [],
  dateFrom: "",
  dateTo: "",
};

export function hasActiveFilters(filters: CostFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.currencies.length > 0 ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""
  );
}

interface Props {
  filters: CostFilters;
  onChange: (filters: CostFilters) => void;
  currencies: CostCurrency[];
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className="cursor-pointer select-none text-xs"
      onClick={onClick}
    >
      {label}
    </Badge>
  );
}

export function CostFiltersBar({ filters, onChange, currencies }: Props) {
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(filters);

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  if (!open) {
    return (
      <Button
        variant={active ? "secondary" : "outline"}
        size="sm"
        className="gap-1 self-start"
        onClick={() => setOpen(true)}
      >
        <Filter className="h-3.5 w-3.5" />
        Filtros
        {active && <span className="ml-1 text-xs font-bold">●</span>}
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Filtros</span>
        <div className="flex gap-2">
          {active && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(EMPTY_FILTERS)}>
              Limpar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Categoria</p>
        <div className="flex flex-wrap gap-1.5">
          {COST_CATEGORIES.map((c) => (
            <ToggleChip
              key={c.value}
              label={c.label}
              active={filters.categories.includes(c.value)}
              onClick={() => onChange({ ...filters, categories: toggleArray(filters.categories, c.value) })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map((p) => (
            <ToggleChip
              key={p.value}
              label={p.label}
              active={filters.paymentMethods.includes(p.value)}
              onClick={() => onChange({ ...filters, paymentMethods: toggleArray(filters.paymentMethods, p.value) })}
            />
          ))}
        </div>
      </div>

      {currencies.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Moeda</p>
          <div className="flex flex-wrap gap-1.5">
            {currencies.map((c) => (
              <ToggleChip
                key={c.code}
                label={c.code}
                active={filters.currencies.includes(c.code)}
                onClick={() => onChange({ ...filters, currencies: toggleArray(filters.currencies, c.code) })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Período</p>
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="w-36"
            placeholder="De"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="w-36"
            placeholder="Até"
          />
        </div>
      </div>
    </div>
  );
}
