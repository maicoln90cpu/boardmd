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
  created_at: string;
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
        .insert({ ...theme, user_id: user!.id })
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
      const { error } = await supabase.from("cost_themes").update(updates).eq("id", id);
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
    mutationFn: async (item: { theme_id: string; description: string; amount: number; currency: string; cost_date: string }) => {
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
      // Sum by original currency
      for (const item of items) {
        totals[item.currency] = (totals[item.currency] || 0) + Number(item.amount);
      }
      // Convert all to each configured currency
      const converted: Record<string, number> = {};
      for (const cur of theme.currencies) {
        let total = 0;
        for (const item of items) {
          const val = convertAmount(Number(item.amount), item.currency, cur.code, theme.exchange_rates);
          if (val !== null) total += val;
        }
        converted[cur.code] = total;
      }
      return { byOriginal: totals, converted };
    },
    [convertAmount]
  );

  // Generate report text
  const generateReportText = useCallback(
    (theme: CostTheme, items: CostItem[]) => {
      const { converted } = calculateTotals(items, theme);
      let text = `📊 *${theme.name}*\n\n`;
      text += `📝 *Itens (${items.length}):*\n`;
      for (const item of items) {
        text += `• ${item.description}: ${Number(item.amount).toFixed(2)} ${item.currency} (${item.cost_date})\n`;
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
    convertAmount,
    calculateTotals,
    generateReportText,
  };
}
