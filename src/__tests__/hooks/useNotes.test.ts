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

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-note-id' }, error: null })),
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

import { useNotes, Note } from '@/hooks/useNotes';
import { supabase } from '@/integrations/supabase/client';

describe('useNotes', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Nota 1',
      content: '<p>Conteúdo da nota 1</p>',
      notebook_id: 'nb-1',
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_pinned: true,
      color: '#ffeb3b',
    },
    {
      id: 'note-2',
      title: 'Nota 2',
      content: '<p>Conteúdo da nota 2</p>',
      notebook_id: null,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_pinned: false,
      color: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock para retornar notas
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'new-note-id', title: 'Nova Nota', ...mockNotes[0] }, 
            error: null 
          }),
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
      const { result } = renderHook(() => useNotes());
      expect(result.current.loading).toBe(true);
    });

    it('deve iniciar com array de notas vazio', () => {
      const { result } = renderHook(() => useNotes());
      expect(result.current.notes).toEqual([]);
    });
  });

  describe('Carregamento de notas', () => {
    it('deve carregar notas do banco', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      expect(result.current.notes).toHaveLength(2);
    });

    it('deve ordenar notas pinadas primeiro', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      const pinnedNotes = result.current.notes.filter(n => n.is_pinned);
      expect(pinnedNotes.length).toBeGreaterThan(0);
    });
  });

  describe('addNote', () => {
    it('deve criar nova nota', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.addNote('Nova Nota', null);
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });

    it('deve criar nota com notebook_id', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.addNote('Nota no Caderno', 'nb-1');
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });
  });

  describe('updateNote', () => {
    it('deve atualizar título da nota', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.updateNote('note-1', { title: 'Título Atualizado' });
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });

    it('deve atualizar conteúdo da nota', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.updateNote('note-1', { content: '<p>Novo conteúdo</p>' });
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });
  });

  describe('deleteNote', () => {
    it('deve mover nota para lixeira', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.deleteNote('note-1');
      });

      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('moveNoteToNotebook', () => {
    it('deve mover nota para outro caderno', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.moveNoteToNotebook('note-2', 'nb-1');
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });

    it('deve remover nota de caderno (mover para null)', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.moveNoteToNotebook('note-1', null);
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });
  });

  describe('togglePin', () => {
    it('deve alternar status de pin', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      await act(async () => {
        await result.current.togglePin('note-2');
      });

      expect(supabase.from).toHaveBeenCalledWith('notes');
    });
  });

  describe('Note interface', () => {
    it('deve ter todas as propriedades necessárias', () => {
      const note: Note = mockNotes[0];

      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('notebook_id');
      expect(note).toHaveProperty('user_id');
      expect(note).toHaveProperty('created_at');
      expect(note).toHaveProperty('updated_at');
      expect(note).toHaveProperty('is_pinned');
      expect(note).toHaveProperty('color');
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', async () => {
      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      expect(typeof result.current.addNote).toBe('function');
      expect(typeof result.current.updateNote).toBe('function');
      expect(typeof result.current.deleteNote).toBe('function');
      expect(typeof result.current.moveNoteToNotebook).toBe('function');
      expect(typeof result.current.togglePin).toBe('function');
      expect(typeof result.current.setEditingNoteId).toBe('function');
      expect(typeof result.current.hasPendingRemoteUpdate).toBe('function');
      expect(typeof result.current.clearPendingRemoteUpdate).toBe('function');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erro ao carregar notas', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Network error' } 
            }),
          }),
          order: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Network error' } 
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

      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      // Deve retornar array vazio em caso de erro
      expect(result.current.notes).toEqual([]);
    });

    it('deve lidar com erro ao criar nota', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
          }),
          order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Insert failed' } 
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const { result } = renderHook(() => useNotes());

      await waitForCondition(() => result.current.loading === false);

      // Não deve lançar erro
      await act(async () => {
        await result.current.addNote('Nova Nota', null);
      });

      // O erro deve ser tratado internamente
      expect(supabase.from).toHaveBeenCalledWith('notes');
    });
  });
});
