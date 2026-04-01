import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CostCurrency } from "@/hooks/useCostCalculator";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    currencies: CostCurrency[];
    base_currency: string;
    exchange_rates: Record<string, number>;
    cc_fee_percent: number;
    cc_iof_percent: number;
  }) => void;
  initial?: {
    name: string;
    currencies: CostCurrency[];
    base_currency: string;
    exchange_rates: Record<string, number>;
    cc_fee_percent?: number;
    cc_iof_percent?: number;
  };
}

const DEFAULT_CURRENCIES: CostCurrency[] = [
  { code: "BRL", name: "Real" },
  { code: "USD", name: "Dólar" },
];

export function CostThemeModal({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name || "");
  const [currencies, setCurrencies] = useState<CostCurrency[]>(
    initial?.currencies || [...DEFAULT_CURRENCIES]
  );
  const [baseCurrency, setBaseCurrency] = useState(initial?.base_currency || "BRL");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    initial?.exchange_rates || {}
  );
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [ccFeeStr, setCcFeeStr] = useState(String(initial?.cc_fee_percent ?? 10));
  const [ccIofStr, setCcIofStr] = useState(String(initial?.cc_iof_percent ?? 6));

  const addCurrency = () => {
    if (!newCode.trim() || !newName.trim()) return;
    const code = newCode.trim().toUpperCase();
    if (currencies.some((c) => c.code === code)) return;
    setCurrencies([...currencies, { code, name: newName.trim() }]);
    setNewCode("");
    setNewName("");
  };

  const removeCurrency = (code: string) => {
    setCurrencies(currencies.filter((c) => c.code !== code));
    // Clean exchange rates
    const newRates = { ...exchangeRates };
    for (const key of Object.keys(newRates)) {
      if (key.includes(code)) delete newRates[key];
    }
    setExchangeRates(newRates);
    if (baseCurrency === code && currencies.length > 1) {
      setBaseCurrency(currencies.find((c) => c.code !== code)?.code || "BRL");
    }
  };

  const rateKey = (a: string, b: string) => `${a}_${b}`;

  // Generate rate pairs
  const ratePairs: [string, string][] = [];
  for (let i = 0; i < currencies.length; i++) {
    for (let j = i + 1; j < currencies.length; j++) {
      ratePairs.push([currencies[i].code, currencies[j].code]);
    }
  }

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      currencies,
      base_currency: baseCurrency,
      exchange_rates: exchangeRates,
      cc_fee_percent: parseFloat(ccFeeStr.replace(",", ".")) || 10,
      cc_iof_percent: parseFloat(ccIofStr.replace(",", ".")) || 6,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Tema" : "Novo Tema de Custos"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do Tema</Label>
            <Input
              placeholder="Ex: Viagem à Argentina"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Moedas</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {currencies.map((c) => (
                <span
                  key={c.code}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
                >
                  {c.code} — {c.name}
                  <button onClick={() => removeCurrency(c.code)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Código (ex: ARS)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-28"
                maxLength={4}
              />
              <Input
                placeholder="Nome (ex: Peso Argentino)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={addCurrency}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Moeda Base</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {ratePairs.length > 0 && (
            <div>
              <Label>Câmbios</Label>
              <div className="space-y-2 mt-1">
                {ratePairs.map(([a, b]) => (
                  <div key={`${a}_${b}`} className="flex items-center gap-2 text-sm">
                    <span className="w-28 text-muted-foreground">1 {a} =</span>
                    <Input
                      type="number"
                      step="any"
                      className="w-32"
                      placeholder="0.00"
                      value={exchangeRates[rateKey(a, b)] ?? ""}
                      onChange={(e) =>
                        setExchangeRates({
                          ...exchangeRates,
                          [rateKey(a, b)]: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-muted-foreground">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Taxas Cartão de Crédito</Label>
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-28 text-muted-foreground">Taxa (%)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="w-32"
                  placeholder="10"
                  value={ccFeeStr}
                  onChange={(e) => setCcFeeStr(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-28 text-muted-foreground">IOF (%)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="w-32"
                  placeholder="6"
                  value={ccIofStr}
                  onChange={(e) => setCcIofStr(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initial ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
