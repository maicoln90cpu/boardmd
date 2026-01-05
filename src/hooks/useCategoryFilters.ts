import { useState, useEffect, useMemo } from "react";
import { Category } from "@/hooks/data/useCategories";

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
  const [selectedCategory, setSelectedCategoryState] = useState<string>("");
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

      // Inicializar filtro de categorias com todas (exceto Diário) - apenas na primeira vez
      if (!categoryFilterInitialized) {
        const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
        setCategoryFilter(allCategoryIds);
        setCategoryFilterInitialized(true);
      }
    }
  }, [categories, categoryFilterInitialized]);

  // Quando selectedCategory mudar, sincronizar com categoryFilter
  const setSelectedCategory = (id: string) => {
    setSelectedCategoryState(id);
    if (id) {
      // Quando seleciona um projeto específico, filtrar apenas por ele
      setCategoryFilter([id]);
      setSelectedCategoryFilterMobile(id);
    } else {
      // Quando limpa a seleção, mostrar todos os projetos
      const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
      setCategoryFilter(allCategoryIds);
      setSelectedCategoryFilterMobile("all");
    }
  };

  // Limpar filtros de categoria
  const clearCategoryFilters = () => {
    setSelectedCategoryState("");
    const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
    setCategoryFilter(allCategoryIds);
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
