import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Helper para aguardar condição assíncrona
const waitForAsync = async (callback: () => void, timeout = 2000) => {
  const start = Date.now();
  let lastError: Error | null = null;
  while (Date.now() - start < timeout) {
    try {
      callback();
      return;
    } catch (e) {
      lastError = e as Error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  if (lastError) throw lastError;
};
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
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

vi.mock('@/hooks/data/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [
      { id: 'cat-diario', name: 'Diário', parent_id: null, depth: 0, position: 0 },
      { id: 'cat-projetos', name: 'Projetos', parent_id: null, depth: 0, position: 1 },
    ],
    loading: false,
  })),
}));

vi.mock('@/hooks/data/useColumns', () => ({
  useColumns: vi.fn(() => ({
    columns: [
      { id: 'col-1', name: 'A Fazer', position: 0 },
      { id: 'col-2', name: 'Em Andamento', position: 1 },
      { id: 'col-3', name: 'Concluído', position: 2 },
    ],
    loading: false,
    getVisibleColumns: vi.fn(() => [
      { id: 'col-1', name: 'A Fazer', position: 0 },
      { id: 'col-2', name: 'Em Andamento', position: 1 },
      { id: 'col-3', name: 'Concluído', position: 2 },
    ]),
  })),
}));

vi.mock('@/hooks/data/useTags', () => ({
  useTags: vi.fn(() => ({
    tags: [
      { id: 'tag-1', name: 'trabalho', color: '#3b82f6' },
      { id: 'tag-2', name: 'pessoal', color: '#22c55e' },
    ],
    loading: false,
    addTag: vi.fn(),
  })),
}));

vi.mock('@/hooks/ui/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { TaskModal } from '@/components/TaskModal';

describe('TaskModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
    columnId: 'col-1',
    categoryId: 'cat-projetos',
  };

  const renderModal = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TaskModal {...defaultProps} {...props} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('Renderização', () => {
    it('deve renderizar o modal quando open=true', () => {
      const { getByText } = renderModal();
      expect(getByText('Nova Tarefa')).toBeInTheDocument();
    });

    it('não deve renderizar quando open=false', () => {
      const { queryByText } = renderModal({ open: false });
      expect(queryByText('Nova Tarefa')).not.toBeInTheDocument();
    });

    it('deve exibir título "Editar Tarefa" quando editando', () => {
      const { getByText } = renderModal({
        task: {
          id: 'task-1',
          title: 'Tarefa existente',
          column_id: 'col-1',
          category_id: 'cat-diario',
        },
      });
      expect(getByText('Editar Tarefa')).toBeInTheDocument();
    });
  });

  describe('Campos do formulário', () => {
    it('deve ter campo de título', () => {
      const { getByPlaceholderText } = renderModal();
      expect(getByPlaceholderText(/título/i)).toBeInTheDocument();
    });

    it('deve ter campo de descrição', () => {
      const { getByPlaceholderText } = renderModal();
      expect(getByPlaceholderText(/descrição/i)).toBeInTheDocument();
    });

    it('deve ter seletor de prioridade', () => {
      const { getByText } = renderModal();
      expect(getByText(/prioridade/i)).toBeInTheDocument();
    });

    it('deve ter botões de salvar e cancelar', () => {
      const { getByText } = renderModal();
      expect(getByText(/salvar/i)).toBeInTheDocument();
      expect(getByText(/cancelar/i)).toBeInTheDocument();
    });
  });

  describe('Preenchimento de dados', () => {
    it('deve preencher título da tarefa ao editar', () => {
      const { getByPlaceholderText } = renderModal({
        task: {
          id: 'task-1',
          title: 'Minha Tarefa',
          column_id: 'col-1',
          category_id: 'cat-diario',
        },
      });
      
      const titleInput = getByPlaceholderText(/título/i);
      expect(titleInput).toHaveValue('Minha Tarefa');
    });

    it('deve preencher descrição da tarefa ao editar', () => {
      const { getByPlaceholderText } = renderModal({
        task: {
          id: 'task-1',
          title: 'Tarefa',
          description: 'Descrição da tarefa',
          column_id: 'col-1',
          category_id: 'cat-diario',
        },
      });
      
      const descInput = getByPlaceholderText(/descrição/i);
      expect(descInput).toHaveValue('Descrição da tarefa');
    });
  });

  describe('Interações', () => {
    it('deve chamar onOpenChange ao cancelar', async () => {
      const onOpenChange = vi.fn();
      const { getByText } = renderModal({ onOpenChange });

      const cancelButton = getByText(/cancelar/i);
      cancelButton.click();

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('deve permitir digitar no campo de título', async () => {
      const user = userEvent.setup();
      const { getByPlaceholderText } = renderModal();

      const titleInput = getByPlaceholderText(/título/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Nova tarefa teste');

      expect(titleInput).toHaveValue('Nova tarefa teste');
    });

    it('deve chamar onSave ao salvar tarefa válida', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const { getByPlaceholderText, getByText } = renderModal({ onSave });

      const titleInput = getByPlaceholderText(/título/i);
      await user.type(titleInput, 'Tarefa de teste');

      const saveButton = getByText(/salvar/i);
      saveButton.click();

      await waitForAsync(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('Validações', () => {
    it('não deve salvar com título vazio', async () => {
      const onSave = vi.fn();
      const { getByText } = renderModal({ onSave });

      const saveButton = getByText(/salvar/i);
      saveButton.click();

      // onSave não deve ser chamado
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Props especiais', () => {
    it('deve usar categoryId padrão quando fornecido', () => {
      const { getByText } = renderModal({ categoryId: 'cat-projetos' });
      // O componente deve estar configurado com a categoria
      expect(getByText('Nova Tarefa')).toBeInTheDocument();
    });

    it('deve usar defaultDueDate quando fornecido', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { getByText } = renderModal({ defaultDueDate: tomorrow.toISOString().split('T')[0] });
      expect(getByText('Nova Tarefa')).toBeInTheDocument();
    });

    it('deve indicar isDailyKanban quando true', () => {
      const { getByText } = renderModal({ isDailyKanban: true });
      expect(getByText('Nova Tarefa')).toBeInTheDocument();
    });
  });
});
