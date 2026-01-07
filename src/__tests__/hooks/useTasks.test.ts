import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies antes dos imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        neq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        in: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-task-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
        in: vi.fn(() => Promise.resolve({ error: null })),
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

import { useTasks, Task } from '@/hooks/tasks/useTasks';
import { supabase } from '@/integrations/supabase/client';

describe('useTasks', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Tarefa 1',
      description: 'Descrição 1',
      priority: 'high',
      due_date: new Date().toISOString(),
      tags: ['trabalho'],
      column_id: 'col-1',
      category_id: 'cat-1',
      position: 0,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: false,
      is_completed: false,
      subtasks: null,
      recurrence_rule: null,
      mirror_task_id: null,
    },
    {
      id: 'task-2',
      title: 'Tarefa 2',
      description: null,
      priority: 'medium',
      due_date: null,
      tags: null,
      column_id: 'col-1',
      category_id: 'cat-1',
      position: 1,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: true,
      is_completed: false,
      subtasks: null,
      recurrence_rule: null,
      mirror_task_id: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    // Setup mock para retornar tarefas
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        }),
        neq: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-task-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);
  });

  describe('Estado inicial', () => {
    it('deve iniciar com loading true', () => {
      const { result } = renderHook(() => useTasks('cat-1'), { wrapper });
      expect(result.current.loading).toBe(true);
    });

    it('deve retornar array vazio quando categoryId é null', async () => {
      const { result } = renderHook(() => useTasks(null), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.tasks).toEqual([]);
    });
  });

  describe('Carregamento de tarefas', () => {
    it('deve carregar tarefas de uma categoria específica', async () => {
      const { result } = renderHook(() => useTasks('cat-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(2);
    });

    it('deve carregar todas as tarefas quando categoryId é "all"', async () => {
      const { result } = renderHook(() => useTasks('all'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Task interface', () => {
    it('deve ter todas as propriedades necessárias', () => {
      const task: Task = mockTasks[0];
      
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('due_date');
      expect(task).toHaveProperty('tags');
      expect(task).toHaveProperty('column_id');
      expect(task).toHaveProperty('category_id');
      expect(task).toHaveProperty('position');
      expect(task).toHaveProperty('user_id');
      expect(task).toHaveProperty('is_favorite');
      expect(task).toHaveProperty('is_completed');
      expect(task).toHaveProperty('subtasks');
      expect(task).toHaveProperty('recurrence_rule');
      expect(task).toHaveProperty('mirror_task_id');
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', async () => {
      const { result } = renderHook(() => useTasks('cat-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.addTask).toBe('function');
      expect(typeof result.current.updateTask).toBe('function');
      expect(typeof result.current.deleteTask).toBe('function');
      expect(typeof result.current.resetAllTasksToFirstColumn).toBe('function');
      expect(typeof result.current.fetchTasks).toBe('function');
      expect(typeof result.current.toggleFavorite).toBe('function');
      expect(typeof result.current.duplicateTask).toBe('function');
    });
  });
});
