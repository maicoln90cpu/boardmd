import { useState, useEffect, useMemo } from "react";
import { Category } from "./useCategories";

export interface CategoryFiltersState {
  selectedCategory: string;
  dailyCategory: string;
  categoryFilter: string[];
  categoryFilterInitialized: boolean;
  selectedCategoryFilterMobile: string;
}

export interface CategoryFiltersActions {
  setSelectedCategory: (id: string) => void;
  setCategoryFilter: (ids: string[]) => void;
  setSelectedCategoryFilterMobile: (id: string) => void;
  clearCategoryFilters: () => void;
}

export function useCategoryFilters(categories: Category[]): CategoryFiltersState & CategoryFiltersActions {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dailyCategory, setDailyCategory] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categoryFilterInitialized, setCategoryFilterInitialized] = useState(false);
  const [selectedCategoryFilterMobile, setSelectedCategoryFilterMobile] = useState<string>("all");

  // Inicializar categorias quando carregarem
  useEffect(() => {
    if (categories.length > 0) {
      // Encontrar categoria "Diário"
      const daily = categories.find(c => c.name === "Diário");
      if (daily) {
        setDailyCategory(daily.id);
      }

      // Selecionar primeira categoria que não seja "Diário"
      if (!selectedCategory) {
        const firstNonDaily = categories.find(c => c.name !== "Diário");
        if (firstNonDaily) {
          setSelectedCategory(firstNonDaily.id);
        }
      }

      // Inicializar filtro de categorias com todas (exceto Diário) - apenas na primeira vez
      if (!categoryFilterInitialized) {
        const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
        setCategoryFilter(allCategoryIds);
        setCategoryFilterInitialized(true);
      }
    }
  }, [categories, selectedCategory, categoryFilterInitialized]);

  // Limpar filtros de categoria
  const clearCategoryFilters = () => {
    setCategoryFilter([]);
    setSelectedCategoryFilterMobile("all");
  };

  return {
    // State
    selectedCategory,
    dailyCategory,
    categoryFilter,
    categoryFilterInitialized,
    selectedCategoryFilterMobile,
    // Actions
    setSelectedCategory,
    setCategoryFilter,
    setSelectedCategoryFilterMobile,
    clearCategoryFilters,
  };
}
