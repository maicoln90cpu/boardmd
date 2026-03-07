import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import type { CostCurrency } from "@/hooks/useCostCalculator";

interface Props {
  currencies: CostCurrency[];
  exchangeRates: Record<string, number>;
  ccFeePercent: number;
  ccIofPercent: number;
  onSave: (rates: Record<string, number>, ccFee: number, ccIof: number) => void;
}

export function ExchangeRateEditor({ currencies, exchangeRates, ccFeePercent, ccIofPercent, onSave }: Props) {
  const [rateStrings, setRateStrings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [key, val] of Object.entries(exchangeRates)) {
      initial[key] = String(val);
    }
    return initial;
  });
  const [feeStr, setFeeStr] = useState(String(ccFeePercent));
  const [iofStr, setIofStr] = useState(String(ccIofPercent));

  const ratePairs: [string, string][] = [];
  for (let i = 0; i < currencies.length; i++) {
    for (let j = i + 1; j < currencies.length; j++) {
      ratePairs.push([currencies[i].code, currencies[j].code]);
    }
  }

  const handleSave = () => {
    const parsed: Record<string, number> = {};
    for (const [key, val] of Object.entries(rateStrings)) {
      parsed[key] = parseFloat(val.replace(",", ".")) || 0;
    }
    const fee = parseFloat(feeStr.replace(",", ".")) || 0;
    const iof = parseFloat(iofStr.replace(",", ".")) || 0;
    onSave(parsed, fee, iof);
  };

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
                type="text"
                inputMode="decimal"
                className="w-32"
                value={rateStrings[key] ?? ""}
                onChange={(e) =>
                  setRateStrings({ ...rateStrings, [key]: e.target.value })
                }
              />
              <span className="text-muted-foreground">{b}</span>
            </div>
          );
        })}
      </div>

      <Label className="text-sm font-semibold">Taxas Cartão de Crédito</Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-24 text-muted-foreground">Taxa (%)</span>
          <Input
            type="text"
            inputMode="decimal"
            className="w-32"
            value={feeStr}
            onChange={(e) => setFeeStr(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-24 text-muted-foreground">IOF (%)</span>
          <Input
            type="text"
            inputMode="decimal"
            className="w-32"
            value={iofStr}
            onChange={(e) => setIofStr(e.target.value)}
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} className="gap-1">
        <Save className="h-3 w-3" /> Salvar
      </Button>
    </div>
  );
}
