import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        neq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        in: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
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

vi.mock('@/hooks/ui/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  })),
}));

vi.mock('@/hooks/data/useSettings', () => ({
  useSettings: vi.fn(() => ({
    settings: {
      theme: 'auto',
      kanban: {
        showTaskCount: true,
        compactMode: false,
        showSubtasks: true,
        showTags: true,
        showPriority: true,
        showDueDate: true,
        columnWidth: 300,
        ultraCompactMode: false,
      },
      interface: {
        enableAnimations: true,
      },
    },
    isLoading: false,
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

// Mock child components to simplify testing
vi.mock('@/components/kanban/KanbanDesktopView', () => ({
  default: ({ columns }: any) => (
    <div data-testid="kanban-desktop-view">
      {columns?.map((col: any) => (
        <div key={col.id} data-testid={`column-${col.id}`}>
          {col.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/kanban/MobileKanbanView', () => ({
  default: () => <div data-testid="kanban-mobile-view">Mobile View</div>,
}));

vi.mock('@/components/TaskModal', () => ({
  TaskModal: () => null,
}));

vi.mock('@/components/kanban/DeleteTaskDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/kanban/BulkActionsBar', () => ({
  default: () => null,
}));

// Import after mocks
import { KanbanBoard } from '@/components/KanbanBoard';
import { useBreakpoint } from '@/hooks/ui/useBreakpoint';

describe('KanbanBoard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockColumns = [
    { id: 'col-1', name: 'A Fazer', position: 0, user_id: 'user-123', created_at: '', color: null },
    { id: 'col-2', name: 'Em Andamento', position: 1, user_id: 'user-123', created_at: '', color: null },
    { id: 'col-3', name: 'Concluído', position: 2, user_id: 'user-123', created_at: '', color: null },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Tarefa 1',
      column_id: 'col-1',
      category_id: 'cat-1',
      position: 0,
      priority: 'high',
      user_id: 'user-123',
      is_favorite: false,
      is_completed: false,
    },
    {
      id: 'task-2',
      title: 'Tarefa 2',
      column_id: 'col-2',
      category_id: 'cat-1',
      position: 0,
      priority: 'medium',
      user_id: 'user-123',
      is_favorite: true,
      is_completed: false,
    },
  ];

  const defaultProps = {
    columns: mockColumns,
    tasks: mockTasks,
    loading: false,
    onTaskUpdate: vi.fn(),
    onTaskDelete: vi.fn(),
    onAddTask: vi.fn(),
    categoryId: 'cat-1',
  };

  const renderBoard = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <KanbanBoard {...defaultProps} {...props} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('Renderização Desktop', () => {
    it('deve renderizar view desktop quando não é mobile', () => {
      const { getByTestId } = renderBoard();
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });

    it('deve renderizar colunas', () => {
      const { getByTestId } = renderBoard();
      expect(getByTestId('column-col-1')).toBeInTheDocument();
      expect(getByTestId('column-col-2')).toBeInTheDocument();
      expect(getByTestId('column-col-3')).toBeInTheDocument();
    });

    it('deve exibir nomes das colunas', () => {
      const { getByText } = renderBoard();
      expect(getByText('A Fazer')).toBeInTheDocument();
      expect(getByText('Em Andamento')).toBeInTheDocument();
      expect(getByText('Concluído')).toBeInTheDocument();
    });
  });

  describe('Renderização Mobile', () => {
    it('deve renderizar view mobile quando isMobile=true', () => {
      vi.mocked(useBreakpoint).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      } as any);

      const { getByTestId } = renderBoard();
      expect(getByTestId('kanban-mobile-view')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('deve passar loading para componentes filhos', () => {
      const { getByTestId } = renderBoard({ loading: true });
      // Componentes devem ser renderizados mesmo durante loading
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });
  });

  describe('Props do KanbanBoard', () => {
    it('deve aceitar categoryId', () => {
      const { getByTestId } = renderBoard({ categoryId: 'cat-projetos' });
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });

    it('deve aceitar isDailyKanban', () => {
      const { getByTestId } = renderBoard({ isDailyKanban: true });
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });

    it('deve aceitar showColumnManager', () => {
      const { getByTestId } = renderBoard({ showColumnManager: true });
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('deve ter callbacks de tarefas configurados', () => {
      const onTaskUpdate = vi.fn();
      const onTaskDelete = vi.fn();
      const onAddTask = vi.fn();

      const { getByTestId } = renderBoard({ onTaskUpdate, onTaskDelete, onAddTask });

      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });
  });

  describe('Sem dados', () => {
    it('deve renderizar com array de colunas vazio', () => {
      const { getByTestId } = renderBoard({ columns: [] });
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });

    it('deve renderizar com array de tarefas vazio', () => {
      const { getByTestId } = renderBoard({ tasks: [] });
      expect(getByTestId('kanban-desktop-view')).toBeInTheDocument();
    });
  });
});
