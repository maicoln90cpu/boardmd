import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Helper para aguardar condição assíncrona
const waitForCondition = async (callback: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (!callback() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-cat-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          on: vi.fn(() => ({
            subscribe: vi.fn(() => ({})),
          })),
        })),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  })),
}));

vi.mock('@/hooks/ui/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({
    isOnline: true,
  })),
}));

vi.mock('@/lib/sync/offlineSync', () => ({
  offlineSync: {
    queueOperation: vi.fn(),
  },
}));

import { useCategories, Category } from '@/hooks/data/useCategories';
import { supabase } from '@/integrations/supabase/client';

describe('useCategories', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const mockCategories: Category[] = [
    {
      id: 'cat-diario',
      name: 'Diário',
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      position: 0,
      parent_id: null,
      depth: 0,
    },
    {
      id: 'cat-projetos',
      name: 'Projetos',
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      position: 1,
      parent_id: null,
      depth: 0,
    },
    {
      id: 'cat-sub1',
      name: 'Projeto A',
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      position: 0,
      parent_id: 'cat-projetos',
      depth: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    // Setup mock para retornar categorias
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-cat-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);
  });

  describe('Estado inicial', () => {
    it('deve iniciar com loading true', () => {
      const { result } = renderHook(() => useCategories(), { wrapper });
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Carregamento de categorias', () => {
    it('deve carregar categorias do banco', async () => {
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitForCondition(() => result.current.loading === false);

      expect(result.current.categories).toHaveLength(3);
    });
  });

  describe('getCategoryTree', () => {
    it('deve retornar árvore hierárquica de categorias', async () => {
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitForCondition(() => result.current.loading === false);

      const tree = result.current.getCategoryTree();
      
      // Deve ter 2 categorias raiz (Diário e Projetos)
      const rootCategories = tree.filter(c => c.parent_id === null);
      expect(rootCategories.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getSubcategories', () => {
    it('deve retornar subcategorias de uma categoria pai', async () => {
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitForCondition(() => result.current.loading === false);

      const subcategories = result.current.getSubcategories('cat-projetos');
      expect(subcategories).toHaveLength(1);
      expect(subcategories[0].name).toBe('Projeto A');
    });

    it('deve retornar array vazio para categoria sem filhos', async () => {
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitForCondition(() => result.current.loading === false);

      const subcategories = result.current.getSubcategories('cat-diario');
      expect(subcategories).toHaveLength(0);
    });
  });

  describe('Category interface', () => {
    it('deve ter todas as propriedades necessárias', () => {
      const category: Category = mockCategories[0];
      
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('user_id');
      expect(category).toHaveProperty('created_at');
      expect(category).toHaveProperty('position');
      expect(category).toHaveProperty('parent_id');
      expect(category).toHaveProperty('depth');
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', async () => {
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitForCondition(() => result.current.loading === false);

      expect(typeof result.current.addCategory).toBe('function');
      expect(typeof result.current.deleteCategory).toBe('function');
      expect(typeof result.current.updateCategory).toBe('function');
      expect(typeof result.current.reorderCategories).toBe('function');
      expect(typeof result.current.getCategoryTree).toBe('function');
      expect(typeof result.current.getFlatHierarchy).toBe('function');
      expect(typeof result.current.getSubcategories).toBe('function');
    });
  });
});
