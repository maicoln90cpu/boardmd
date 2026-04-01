import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COST_CATEGORIES, PAYMENT_METHODS } from "@/hooks/useCostCalculator";
import type { CostItem, CostCurrency } from "@/hooks/useCostCalculator";

interface Props {
  item: CostItem;
  currencies: CostCurrency[];
  open: boolean;
  onClose: () => void;
  onSave: (updates: { id: string; description: string; amount: number; currency: string; cost_date: string; cost_time: string; category: string; payment_method: string }) => void;
}

export function CostItemEditModal({ item, currencies, open, onClose, onSave }: Props) {
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(String(item.amount));
  const [currency, setCurrency] = useState(item.currency);
  const [costDate, setCostDate] = useState(item.cost_date);
  const [costTime, setCostTime] = useState(item.cost_time || "12:00");
  const [category, setCategory] = useState(item.category);
  const [paymentMethod, setPaymentMethod] = useState(item.payment_method);

  const handleSave = () => {
    if (!description.trim() || !amount) return;
    onSave({
      id: item.id,
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      cost_date: costDate,
      cost_time: costTime,
      category,
      payment_method: paymentMethod,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              placeholder="Valor"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {COST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={costDate}
              onChange={(e) => setCostDate(e.target.value)}
              className="flex-1"
            />
            <Input
              type="time"
              value={costTime}
              onChange={(e) => setCostTime(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!description.trim() || !amount}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
