import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock('@/hooks/ui/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('@/hooks/useDueDateAlerts', () => ({
  getTaskUrgency: vi.fn(() => 'normal'),
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

import { TaskCard } from '@/components/TaskCard';
import { Task } from '@/hooks/tasks/useTasks';

describe('TaskCard Component', () => {
  const mockTask: Task & { categories?: { name: string } } = {
    id: 'task-1',
    title: 'Tarefa de Teste',
    description: 'Descrição da tarefa',
    priority: 'high',
    due_date: new Date().toISOString(),
    tags: ['trabalho', 'urgente'],
    column_id: 'col-1',
    category_id: 'cat-1',
    position: 0,
    user_id: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_favorite: false,
    is_completed: false,
    subtasks: [
      { id: 'sub-1', title: 'Subtarefa 1', completed: false },
      { id: 'sub-2', title: 'Subtarefa 2', completed: true },
    ],
    recurrence_rule: null,
    mirror_task_id: null,
    categories: { name: 'Projeto A' },
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onMoveLeft: vi.fn(),
    onMoveRight: vi.fn(),
    onToggleFavorite: vi.fn(),
    onDuplicate: vi.fn(),
    onAddPoints: vi.fn(),
    onToggleSelection: vi.fn(),
    onMoveToCompleted: vi.fn(),
  };

  const renderTaskCard = (props = {}) => {
    return render(
      <BrowserRouter>
        <TaskCard
          task={mockTask}
          onEdit={mockHandlers.onEdit}
          onDelete={mockHandlers.onDelete}
          {...props}
        />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização básica', () => {
    it('deve renderizar o título da tarefa', () => {
      const { getByText } = renderTaskCard();
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });

    it('deve renderizar o checkbox', () => {
      const { getByRole } = renderTaskCard();
      const checkbox = getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Modos de densidade', () => {
    it('deve renderizar em modo comfortable por padrão', () => {
      const { getByText } = renderTaskCard();
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });

    it('deve renderizar em modo compact', () => {
      const { getByText } = renderTaskCard({ densityMode: 'compact' });
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });

    it('deve renderizar em modo ultra-compact', () => {
      const { getByText } = renderTaskCard({ densityMode: 'ultra-compact' });
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });
  });

  describe('Estados visuais', () => {
    it('deve aplicar estilo de selecionado', () => {
      const { getByText } = renderTaskCard({ isSelected: true });
      const title = getByText('Tarefa de Teste');
      const card = title.closest('.overflow-hidden');
      expect(card?.className).toContain('ring-2');
    });

    it('deve renderizar tarefa completa corretamente', () => {
      const completedTask = { ...mockTask, is_completed: true };
      const { getByRole } = render(
        <BrowserRouter>
          <TaskCard
            task={completedTask}
            onEdit={mockHandlers.onEdit}
            onDelete={mockHandlers.onDelete}
          />
        </BrowserRouter>
      );
      
      const checkbox = getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('Tarefa favorita', () => {
    it('deve renderizar tarefa favorita', () => {
      const favoriteTask = { ...mockTask, is_favorite: true };
      const { getByText } = render(
        <BrowserRouter>
          <TaskCard
            task={favoriteTask}
            onEdit={mockHandlers.onEdit}
            onDelete={mockHandlers.onDelete}
            onToggleFavorite={mockHandlers.onToggleFavorite}
          />
        </BrowserRouter>
      );
      
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });
  });

  describe('Tarefa com recorrência', () => {
    it('deve renderizar tarefa com recorrência', () => {
      const recurrentTask = {
        ...mockTask,
        recurrence_rule: { frequency: 'daily' as const, interval: 1 },
      };
      const { getByText } = render(
        <BrowserRouter>
          <TaskCard
            task={recurrentTask}
            onEdit={mockHandlers.onEdit}
            onDelete={mockHandlers.onDelete}
          />
        </BrowserRouter>
      );
      
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });
  });

  describe('Tarefa espelhada', () => {
    it('deve renderizar tarefa espelhada', () => {
      const mirroredTask = { ...mockTask, mirror_task_id: 'task-original' };
      const { getByText } = render(
        <BrowserRouter>
          <TaskCard
            task={mirroredTask}
            onEdit={mockHandlers.onEdit}
            onDelete={mockHandlers.onDelete}
          />
        </BrowserRouter>
      );
      
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });
  });

  describe('Props adicionais', () => {
    it('deve aceitar prop showCategoryBadge', () => {
      const { getByText } = renderTaskCard({ showCategoryBadge: true });
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });

    it('deve aceitar prop hideBadges', () => {
      const { getByText } = renderTaskCard({ hideBadges: true });
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });

    it('deve aceitar props de movimento', () => {
      const { getByText } = renderTaskCard({
        canMoveLeft: true,
        canMoveRight: true,
        onMoveLeft: mockHandlers.onMoveLeft,
        onMoveRight: mockHandlers.onMoveRight,
      });
      
      expect(getByText('Tarefa de Teste')).toBeInTheDocument();
    });
  });
});
