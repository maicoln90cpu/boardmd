import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do audit log
vi.mock('@/hooks/useAuditLog', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession = {
    access_token: 'token-123',
    refresh_token: 'refresh-123',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock padrão: sem sessão ativa
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Mock do listener de auth
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          id: 'sub-123',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  // Helper para aguardar estado
  const waitForLoadingComplete = async (result: { current: ReturnType<typeof useAuth> }) => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  };

  describe('Estado inicial', () => {
    it('deve iniciar sem usuário', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);
      expect(result.current.user).toBeNull();
    });

    it('deve carregar usuário existente da sessão', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('signUp', () => {
    it('deve criar conta com sucesso', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser as any, session: mockSession as any },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User', '11999999999');
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: expect.objectContaining({
          emailRedirectTo: expect.any(String),
        }),
      });
    });

    it('deve lançar erro em caso de falha', async () => {
      const mockError = { message: 'Email já existe' };
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);

      await expect(
        act(async () => {
          await result.current.signUp('test@example.com', 'password123', 'Test User');
        })
      ).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    it('deve fazer login com sucesso', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser as any, session: mockSession as any },
        error: null,
      });

      // Mock para verificação de perfil
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockUser.id },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('deve lançar erro com credenciais inválidas', async () => {
      const mockError = { message: 'Credenciais inválidas' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('deve fazer logout com sucesso', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('useAuth fora do provider', () => {
    it('deve lançar erro quando usado fora do AuthProvider', () => {
      // Suprimir console.error para este teste
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
