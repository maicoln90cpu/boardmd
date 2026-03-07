import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";

export interface CostCurrency {
  code: string;
  name: string;
}

export interface CostTheme {
  id: string;
  user_id: string;
  name: string;
  currencies: CostCurrency[];
  exchange_rates: Record<string, number>;
  base_currency: string;
  cc_fee_percent: number;
  cc_iof_percent: number;
  created_at: string;
  updated_at: string;
}

export interface CostItem {
  id: string;
  theme_id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  cost_date: string;
  category: string;
  payment_method: string;
  created_at: string;
}

export const COST_CATEGORIES = [
  { value: "presente", label: "Presente" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "transporte", label: "Transporte" },
  { value: "aleatorios", label: "Aleatórios" },
  { value: "outros", label: "Outros" },
] as const;

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "papel_moeda", label: "Papel Moeda" },
] as const;

export function getEffectiveAmount(amount: number, paymentMethod: string, ccFeePercent = 10, ccIofPercent = 6): number {
  if (paymentMethod === "credit_card") {
    const feeMultiplier = 1 + ccFeePercent / 100;
    const iofMultiplier = 1 + ccIofPercent / 100;
    return amount * feeMultiplier * iofMultiplier;
  }
  return amount;
}

export function useCostCalculator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch themes
  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ["cost-themes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_themes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        currencies: t.currencies as CostCurrency[],
        exchange_rates: t.exchange_rates as Record<string, number>,
        cc_fee_percent: t.cc_fee_percent ?? 10,
        cc_iof_percent: t.cc_iof_percent ?? 6,
      })) as CostTheme[];
    },
    enabled: !!user,
  });

  // Fetch items for a theme
  const useThemeItems = (themeId: string | null) =>
    useQuery({
      queryKey: ["cost-items", themeId],
      queryFn: async () => {
        if (!themeId) return [];
        const { data, error } = await supabase
          .from("cost_items")
          .select("*")
          .eq("theme_id", themeId)
          .order("cost_date", { ascending: false });
        if (error) throw error;
        return (data ?? []) as CostItem[];
      },
      enabled: !!themeId && !!user,
    });

  // Create theme
  const createTheme = useMutation({
    mutationFn: async (theme: { name: string; currencies: CostCurrency[]; base_currency: string; exchange_rates: Record<string, number> }) => {
      const { data, error } = await supabase
        .from("cost_themes")
        .insert({
          name: theme.name,
          currencies: theme.currencies as any,
          exchange_rates: theme.exchange_rates as any,
          base_currency: theme.base_currency,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-themes"] });
      toast({ title: "✓ Tema criado" });
    },
    onError: () => toast({ title: "Erro ao criar tema", variant: "destructive" }),
  });

  // Update theme
  const updateTheme = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CostTheme> & { id: string }) => {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.currencies !== undefined) payload.currencies = updates.currencies as any;
      if (updates.exchange_rates !== undefined) payload.exchange_rates = updates.exchange_rates as any;
      if (updates.base_currency !== undefined) payload.base_currency = updates.base_currency;
      const { error } = await supabase.from("cost_themes").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-themes"] });
      queryClient.invalidateQueries({ queryKey: ["cost-items"] });
      toast({ title: "✓ Tema atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar tema", variant: "destructive" }),
  });

  // Delete theme
  const deleteTheme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_themes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-themes"] });
      toast({ title: "✓ Tema excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir tema", variant: "destructive" }),
  });

  // Create item
  const createItem = useMutation({
    mutationFn: async (item: { theme_id: string; description: string; amount: number; currency: string; cost_date: string; category: string; payment_method: string }) => {
      const { data, error } = await supabase
        .from("cost_items")
        .insert({ ...item, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-items"] });
      toast({ title: "✓ Item adicionado" });
    },
    onError: () => toast({ title: "Erro ao adicionar item", variant: "destructive" }),
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; description?: string; amount?: number; currency?: string; cost_date?: string; category?: string; payment_method?: string }) => {
      const { error } = await supabase.from("cost_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-items"] });
      toast({ title: "✓ Item atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar item", variant: "destructive" }),
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-items"] });
      toast({ title: "✓ Item removido" });
    },
    onError: () => toast({ title: "Erro ao remover item", variant: "destructive" }),
  });

  // Convert amount between currencies
  const convertAmount = useCallback(
    (amount: number, fromCurrency: string, toCurrency: string, exchangeRates: Record<string, number>): number | null => {
      if (fromCurrency === toCurrency) return amount;
      const key = `${fromCurrency}_${toCurrency}`;
      const reverseKey = `${toCurrency}_${fromCurrency}`;
      if (exchangeRates[key]) return amount * exchangeRates[key];
      if (exchangeRates[reverseKey]) return amount / exchangeRates[reverseKey];
      return null;
    },
    []
  );

  // Calculate totals for a theme
  const calculateTotals = useCallback(
    (items: CostItem[], theme: CostTheme) => {
      const totals: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      let totalCCFees = 0;
      let totalCCIOF = 0;
      const baseCur = theme.base_currency;

      for (const item of items) {
        const amt = Number(item.amount);
        const effective = getEffectiveAmount(amt, item.payment_method);
        totals[item.currency] = (totals[item.currency] || 0) + effective;

        // Convert effective amount to base currency for category totals
        const effectiveInBase = convertAmount(effective, item.currency, baseCur, theme.exchange_rates) ?? effective;
        const catKey = item.category || "outros";
        byCategory[catKey] = (byCategory[catKey] || 0) + effectiveInBase;

        // Track CC fees converted to base currency
        if (item.payment_method === "credit_card") {
          const fee = amt * 0.10;
          const iof = (amt + fee) * 0.06;
          const feeInBase = convertAmount(fee, item.currency, baseCur, theme.exchange_rates) ?? fee;
          const iofInBase = convertAmount(iof, item.currency, baseCur, theme.exchange_rates) ?? iof;
          totalCCFees += feeInBase;
          totalCCIOF += iofInBase;
        }
      }

      // Convert all to each configured currency
      const converted: Record<string, number> = {};
      for (const cur of theme.currencies) {
        let total = 0;
        for (const item of items) {
          const effective = getEffectiveAmount(Number(item.amount), item.payment_method);
          const val = convertAmount(effective, item.currency, cur.code, theme.exchange_rates);
          if (val !== null) total += val;
        }
        converted[cur.code] = total;
      }
      return { byOriginal: totals, converted, byCategory, ccFees: totalCCFees, ccIOF: totalCCIOF };
    },
    [convertAmount]
  );

  // Generate report text
  const generateReportText = useCallback(
    (theme: CostTheme, items: CostItem[]) => {
      const { converted, ccFees, ccIOF } = calculateTotals(items, theme);
      const catLabels: Record<string, string> = { presente: "Presente", alimentacao: "Alimentação", transporte: "Transporte", aleatorios: "Aleatórios", outros: "Outros" };
      const pmLabels: Record<string, string> = { pix: "PIX", credit_card: "Cartão de Crédito", papel_moeda: "Papel Moeda" };
      let text = `📊 *${theme.name}*\n\n`;
      text += `📝 *Itens (${items.length}):*\n`;
      for (const item of items) {
        const catLabel = catLabels[item.category] || item.category;
        const pmLabel = pmLabels[item.payment_method] || item.payment_method;
        let line = `• ${item.description}: ${Number(item.amount).toFixed(2)} ${item.currency} (${item.cost_date}) [${catLabel}] [${pmLabel}]`;
        if (item.payment_method === "credit_card") {
          line += ` → ${getEffectiveAmount(Number(item.amount), item.payment_method).toFixed(2)} ${item.currency} c/ taxas`;
        }
        text += line + "\n";
      }
      if (ccFees > 0) {
        text += `\n💳 *Taxas Cartão de Crédito:*\n`;
        text += `• Taxa 10%: ${ccFees.toFixed(2)}\n`;
        text += `• IOF 6%: ${ccIOF.toFixed(2)}\n`;
        text += `• Total taxas: ${(ccFees + ccIOF).toFixed(2)}\n`;
      }
      text += `\n💰 *Totais Convertidos:*\n`;
      for (const cur of theme.currencies) {
        const name = cur.name;
        text += `• ${name}: ${(converted[cur.code] || 0).toFixed(2)} ${cur.code}\n`;
      }
      text += `\n📈 *Câmbios Utilizados:*\n`;
      for (const [key, val] of Object.entries(theme.exchange_rates)) {
        const [from, to] = key.split("_");
        text += `• 1 ${from} = ${val} ${to}\n`;
      }
      return text;
    },
    [calculateTotals]
  );

  return {
    themes,
    loadingThemes,
    useThemeItems,
    createTheme,
    updateTheme,
    deleteTheme,
    createItem,
    deleteItem,
    updateItem,
    convertAmount,
    calculateTotals,
    generateReportText,
  };
}
