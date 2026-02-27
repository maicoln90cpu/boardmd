import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Category } from "@/hooks/data/useCategories";

export interface CategoryFiltersState {
  selectedCategory: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const projectParam = searchParams.get("project");
  const [selectedCategory, setSelectedCategoryState] = useState<string>(projectParam || "");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categoryFilterInitialized, setCategoryFilterInitialized] = useState(false);
  const [selectedCategoryFilterMobile, setSelectedCategoryFilterMobile] = useState<string>("all");

  // Ler query param ?project= ao montar e aplicar filtro
  useEffect(() => {
    if (projectParam && categories.length > 0) {
      const exists = categories.some(c => c.id === projectParam);
      if (exists) {
        setSelectedCategoryState(projectParam);
        setCategoryFilter([projectParam]);
        setSelectedCategoryFilterMobile(projectParam);
        setCategoryFilterInitialized(true);
      }
      // Limpar o param da URL para não ficar "preso"
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("project");
        return next;
      }, { replace: true });
    }
  }, [projectParam, categories]);

  // Inicializar categorias quando carregarem
  useEffect(() => {
    if (categories.length > 0) {
      // Inicializar filtro de categorias com todas - apenas na primeira vez
      if (!categoryFilterInitialized && !projectParam) {
        const allCategoryIds = categories.map(c => c.id);
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
      const allCategoryIds = categories.map(c => c.id);
      setCategoryFilter(allCategoryIds);
      setSelectedCategoryFilterMobile("all");
    }
  };

  // Limpar filtros de categoria
  const clearCategoryFilters = () => {
    setSelectedCategoryState("");
    const allCategoryIds = categories.map(c => c.id);
    setCategoryFilter(allCategoryIds);
    setSelectedCategoryFilterMobile("all");
  };

  return {
    // State
    selectedCategory,
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
