import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { CostCurrency } from "@/hooks/useCostCalculator";

interface Props {
  currencies: CostCurrency[];
  onAdd: (item: { description: string; amount: number; currency: string; cost_date: string }) => void;
}

export function CostItemForm({ currencies, onAdd }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0]?.code || "BRL");
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));

  const handleAdd = () => {
    if (!description.trim() || !amount) return;
    onAdd({
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      cost_date: costDate,
    });
    setDescription("");
    setAmount("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <Input
        placeholder="Descrição do produto"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        step="any"
        placeholder="Valor"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
      />
      <select
        className="rounded-md border border-input bg-background px-3 py-2 text-sm w-24"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
      <Input
        type="date"
        value={costDate}
        onChange={(e) => setCostDate(e.target.value)}
        className="w-36"
      />
      <Button onClick={handleAdd} disabled={!description.trim() || !amount} size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
