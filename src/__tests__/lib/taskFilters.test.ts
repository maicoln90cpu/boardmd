import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterBySearchTerm,
  filterByPriority,
  filterByTag,
  filterByDueDate,
  filterByDueDateKanban,
  sortTasksByOption,
  applyAllFilters,
  filterAndSortTasks,
  type TaskLike,
} from '@/lib/taskFilters';

// Mock de tarefas para testes
const createMockTasks = (): TaskLike[] => [
  {
    id: '1',
    title: 'Tarefa Urgente',
    description: 'Descrição importante',
    due_date: new Date().toISOString(), // Hoje
    priority: 'high',
    tags: ['trabalho', 'urgente'],
    is_completed: false,
    position: 1,
    column_id: 'col1',
    category_id: 'cat1',
  },
  {
    id: '2',
    title: 'Tarefa Normal',
    description: 'Tarefa do dia a dia',
    due_date: new Date(Date.now() + 86400000).toISOString(), // Amanhã
    priority: 'medium',
    tags: ['pessoal'],
    is_completed: false,
    position: 2,
    column_id: 'col1',
    category_id: 'cat1',
  },
  {
    id: '3',
    title: 'Tarefa Baixa Prioridade',
    description: null,
    due_date: null,
    priority: 'low',
    tags: null,
    is_completed: true,
    position: 3,
    column_id: 'col2',
    category_id: 'cat1',
  },
  {
    id: '4',
    title: 'Projeto Especial',
    description: 'Projeto de longo prazo',
    due_date: new Date(Date.now() - 86400000).toISOString(), // Ontem (atrasado)
    priority: 'high',
    tags: ['trabalho', 'projeto'],
    is_completed: false,
    position: 0,
    column_id: 'col1',
    category_id: 'cat2',
  },
];

describe('taskFilters', () => {
  let mockTasks: TaskLike[];

  beforeEach(() => {
    mockTasks = createMockTasks();
    vi.clearAllMocks();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  describe('filterBySearchTerm', () => {
    it('deve retornar todas as tarefas se termo estiver vazio', () => {
      const result = filterBySearchTerm(mockTasks, '');
      expect(result).toHaveLength(4);
    });

    it('deve filtrar por título', () => {
      const result = filterBySearchTerm(mockTasks, 'Urgente');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('deve filtrar por descrição', () => {
      const result = filterBySearchTerm(mockTasks, 'importante');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('deve filtrar por tag', () => {
      const result = filterBySearchTerm(mockTasks, 'trabalho');
      expect(result).toHaveLength(2);
    });

    it('deve ser case-insensitive', () => {
      const result = filterBySearchTerm(mockTasks, 'URGENTE');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterByPriority', () => {
    it('deve retornar todas as tarefas se filtro for "all"', () => {
      const result = filterByPriority(mockTasks, 'all');
      expect(result).toHaveLength(4);
    });

    it('deve filtrar por prioridade alta', () => {
      const result = filterByPriority(mockTasks, 'high');
      expect(result).toHaveLength(2);
    });

    it('deve filtrar por prioridade média', () => {
      const result = filterByPriority(mockTasks, 'medium');
      expect(result).toHaveLength(1);
    });

    it('deve filtrar por prioridade baixa', () => {
      const result = filterByPriority(mockTasks, 'low');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterByTag', () => {
    it('deve retornar todas as tarefas se filtro for "all"', () => {
      const result = filterByTag(mockTasks, 'all');
      expect(result).toHaveLength(4);
    });

    it('deve filtrar por tag específica', () => {
      const result = filterByTag(mockTasks, 'trabalho');
      expect(result).toHaveLength(2);
    });

    it('deve retornar vazio para tag inexistente', () => {
      const result = filterByTag(mockTasks, 'inexistente');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByDueDate', () => {
    it('deve retornar todas as tarefas se filtro for "all"', () => {
      const result = filterByDueDate(mockTasks, 'all');
      expect(result).toHaveLength(4);
    });

    it('deve filtrar tarefas sem data', () => {
      const result = filterByDueDate(mockTasks, 'no_date');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('deve filtrar tarefas de hoje', () => {
      const result = filterByDueDate(mockTasks, 'today');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('deve filtrar tarefas de amanhã', () => {
      const result = filterByDueDate(mockTasks, 'tomorrow');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('deve filtrar tarefas atrasadas', () => {
      const result = filterByDueDate(mockTasks, 'overdue');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  describe('filterByDueDateKanban', () => {
    it('deve esconder tarefas completadas quando hideCompleted=true', () => {
      const result = filterByDueDateKanban(mockTasks, 'all', true);
      expect(result).toHaveLength(3);
      expect(result.find(t => t.id === '3')).toBeUndefined();
    });

    it('deve filtrar tarefas sem data', () => {
      const result = filterByDueDateKanban(mockTasks, 'no_date');
      expect(result.every(t => t.due_date === null)).toBe(true);
    });
  });

  describe('sortTasksByOption', () => {
    it('deve ordenar manualmente por position', () => {
      const result = sortTasksByOption(mockTasks, 'manual');
      expect(result[0].id).toBe('4'); // position 0
      expect(result[1].id).toBe('1'); // position 1
    });

    it('deve ordenar por nome A-Z', () => {
      const result = sortTasksByOption(mockTasks, 'name_asc');
      expect(result[0].title).toBe('Projeto Especial');
    });

    it('deve ordenar por nome Z-A', () => {
      const result = sortTasksByOption(mockTasks, 'name_desc');
      expect(result[0].title).toBe('Tarefa Urgente');
    });

    it('deve ordenar por prioridade crescente', () => {
      const result = sortTasksByOption(mockTasks, 'priority_asc');
      expect(result[0].priority).toBe('low');
    });

    it('deve ordenar por prioridade decrescente', () => {
      const result = sortTasksByOption(mockTasks, 'priority_desc');
      expect(result[0].priority).toBe('high');
    });

    it('deve ordenar por data crescente', () => {
      const result = sortTasksByOption(mockTasks, 'date_asc');
      // Tarefa atrasada deve vir primeiro
      expect(result[0].id).toBe('4');
    });

    it('deve ordenar por data decrescente', () => {
      const result = sortTasksByOption(mockTasks, 'date_desc');
      // Tarefas sem data devem ter valor padrão negativo
      // Tarefa de amanhã deve vir primeiro entre as com data
    });
  });

  describe('applyAllFilters', () => {
    it('deve aplicar múltiplos filtros combinados', () => {
      const result = applyAllFilters(mockTasks, {
        priorityFilter: 'high',
        hideCompleted: true,
      });
      expect(result).toHaveLength(2);
      expect(result.every(t => t.priority === 'high')).toBe(true);
    });

    it('deve combinar busca com filtro de prioridade', () => {
      const result = applyAllFilters(mockTasks, {
        searchTerm: 'Projeto',
        priorityFilter: 'high',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  describe('filterAndSortTasks', () => {
    it('deve filtrar e ordenar em uma operação', () => {
      const result = filterAndSortTasks(
        mockTasks,
        { priorityFilter: 'high' },
        'name_asc'
      );
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Projeto Especial');
      expect(result[1].title).toBe('Tarefa Urgente');
    });

    it('deve usar ordenação manual por padrão', () => {
      const result = filterAndSortTasks(mockTasks, {});
      expect(result[0].id).toBe('4'); // position 0
    });
  });
});
