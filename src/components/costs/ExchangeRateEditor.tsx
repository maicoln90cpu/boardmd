import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import type { CostCurrency } from "@/hooks/useCostCalculator";

interface Props {
  currencies: CostCurrency[];
  exchangeRates: Record<string, number>;
  onSave: (rates: Record<string, number>) => void;
}

export function ExchangeRateEditor({ currencies, exchangeRates, onSave }: Props) {
  const [rates, setRates] = useState<Record<string, number>>({ ...exchangeRates });

  const ratePairs: [string, string][] = [];
  for (let i = 0; i < currencies.length; i++) {
    for (let j = i + 1; j < currencies.length; j++) {
      ratePairs.push([currencies[i].code, currencies[j].code]);
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Editar Câmbio</Label>
      <div className="space-y-2">
        {ratePairs.map(([a, b]) => {
          const key = `${a}_${b}`;
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="w-24 text-muted-foreground">1 {a} =</span>
              <Input
                type="number"
                step="any"
                className="w-32"
                value={rates[key] ?? ""}
                onChange={(e) =>
                  setRates({ ...rates, [key]: parseFloat(e.target.value) || 0 })
                }
              />
              <span className="text-muted-foreground">{b}</span>
            </div>
          );
        })}
      </div>
      <Button size="sm" onClick={() => onSave(rates)} className="gap-1">
        <Save className="h-3 w-3" /> Salvar Câmbio
      </Button>
    </div>
  );
}
