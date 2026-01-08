import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Helper para aguardar condição assíncrona
const waitForCondition = async (callback: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (!callback() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-col-id' }, error: null })),
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
        subscribe: vi.fn(() => ({})),
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

import { useColumns, Column } from '@/hooks/data/useColumns';
import { supabase } from '@/integrations/supabase/client';

describe('useColumns', () => {
  const mockColumns: Column[] = [
    {
      id: 'col-1',
      name: 'A Fazer',
      position: 0,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      color: null,
      kanban_type: null,
      show_in_daily: true,
      show_in_projects: true,
    },
    {
      id: 'col-2',
      name: 'Em Andamento',
      position: 1,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      color: '#3b82f6',
      kanban_type: null,
      show_in_daily: true,
      show_in_projects: true,
    },
    {
      id: 'col-3',
      name: 'Concluído',
      position: 2,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      color: '#22c55e',
      kanban_type: null,
      show_in_daily: true,
      show_in_projects: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Setup mock para retornar colunas
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockColumns, error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockColumns, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-col-id', ...mockColumns[0] }, error: null }),
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
      const { result } = renderHook(() => useColumns());
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Carregamento de colunas', () => {
    it('deve carregar colunas do banco', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      expect(result.current.columns).toHaveLength(3);
    });

    it('deve ordenar colunas por posição', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      expect(result.current.columns[0].name).toBe('A Fazer');
      expect(result.current.columns[1].name).toBe('Em Andamento');
      expect(result.current.columns[2].name).toBe('Concluído');
    });
  });

  describe('addColumn', () => {
    it('deve adicionar nova coluna', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.addColumn('Nova Coluna');
      });

      expect(supabase.from).toHaveBeenCalledWith('columns');
    });

    it('deve validar nome vazio', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.addColumn('');
      });

      // Não deve chamar insert com nome vazio
      const insertCalls = vi.mocked(supabase.from).mock.results.filter(
        r => r.value?.insert
      );
      expect(insertCalls.length).toBe(0);
    });
  });

  describe('updateColumnColor', () => {
    it('deve atualizar cor da coluna', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.updateColumnColor('col-1', '#ff0000');
      });

      expect(supabase.from).toHaveBeenCalledWith('columns');
    });

    it('deve aceitar null para remover cor', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.updateColumnColor('col-2', null);
      });

      expect(supabase.from).toHaveBeenCalledWith('columns');
    });
  });

  describe('renameColumn', () => {
    it('deve renomear coluna existente', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.renameColumn('col-1', 'Novo Nome');
      });

      expect(supabase.from).toHaveBeenCalledWith('columns');
    });
  });

  describe('toggleColumnVisibility', () => {
    it('deve alternar visibilidade no localStorage', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      act(() => {
        result.current.toggleColumnVisibility('col-1');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('getVisibleColumns', () => {
    it('deve retornar colunas visíveis', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      const visibleColumns = result.current.getVisibleColumns();
      expect(visibleColumns.length).toBeGreaterThan(0);
    });

    it('deve filtrar por kanbanType', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      const dailyColumns = result.current.getVisibleColumns('daily');
      expect(dailyColumns.every(c => c.show_in_daily !== false)).toBe(true);
    });
  });

  describe('Column interface', () => {
    it('deve ter todas as propriedades necessárias', () => {
      const column: Column = mockColumns[0];

      expect(column).toHaveProperty('id');
      expect(column).toHaveProperty('name');
      expect(column).toHaveProperty('position');
      expect(column).toHaveProperty('user_id');
      expect(column).toHaveProperty('created_at');
      expect(column).toHaveProperty('color');
      expect(column).toHaveProperty('kanban_type');
      expect(column).toHaveProperty('show_in_daily');
      expect(column).toHaveProperty('show_in_projects');
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', async () => {
      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      expect(typeof result.current.addColumn).toBe('function');
      expect(typeof result.current.updateColumnColor).toBe('function');
      expect(typeof result.current.deleteColumn).toBe('function');
      expect(typeof result.current.toggleColumnVisibility).toBe('function');
      expect(typeof result.current.getVisibleColumns).toBe('function');
      expect(typeof result.current.resetToDefaultView).toBe('function');
      expect(typeof result.current.renameColumn).toBe('function');
      expect(typeof result.current.reorderColumns).toBe('function');
      expect(typeof result.current.toggleColumnKanbanVisibility).toBe('function');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erro ao carregar colunas', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Network error' } 
          }),
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Network error' } 
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useColumns());

      await waitForCondition(() => result.current.loading === false);

      // Deve retornar array vazio em caso de erro
      expect(result.current.columns).toEqual([]);
    });
  });
});
