import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COST_CATEGORIES, PAYMENT_METHODS, type CostCurrency } from "@/hooks/useCostCalculator";
import { getNowInTimezone, formatTimeOnlyBR } from "@/lib/dateUtils";

interface Props {
  currencies: CostCurrency[];
  onAdd: (item: { description: string; amount: number; currency: string; cost_date: string; cost_time: string; category: string; payment_method: string }) => void;
}

function getDefaultDate(): string {
  const now = getNowInTimezone();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultTime(): string {
  return formatTimeOnlyBR(new Date());
}

export function CostItemForm({ currencies, onAdd }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0]?.code || "BRL");
  const [costDate, setCostDate] = useState(getDefaultDate);
  const [costTime, setCostTime] = useState(getDefaultTime);
  const [category, setCategory] = useState("outros");
  const [paymentMethod, setPaymentMethod] = useState("papel_moeda");

  const handleAdd = () => {
    if (!description.trim() || !amount) return;
    onAdd({
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      cost_date: costDate,
      cost_time: costTime,
      category,
      payment_method: paymentMethod,
    });
    setDescription("");
    setAmount("");
    setCostTime(getDefaultTime());
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex flex-col sm:flex-row gap-2">
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
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {COST_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={costDate}
          onChange={(e) => setCostDate(e.target.value)}
          className="w-36"
        />
        <Input
          type="time"
          value={costTime}
          onChange={(e) => setCostTime(e.target.value)}
          className="w-28"
        />
        <Button onClick={handleAdd} disabled={!description.trim() || !amount} size="icon" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
