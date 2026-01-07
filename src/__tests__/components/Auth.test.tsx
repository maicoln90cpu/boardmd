import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { Auth } from '@/components/Auth';

describe('Auth Component', () => {
  const renderAuth = () => {
    return render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização inicial', () => {
    it('deve renderizar formulário de login por padrão', () => {
      const { getByText, getByPlaceholderText } = renderAuth();
      
      expect(getByText('Entrar')).toBeInTheDocument();
      expect(getByPlaceholderText('Email')).toBeInTheDocument();
      expect(getByPlaceholderText('Senha')).toBeInTheDocument();
    });

    it('deve ter botão para alternar para registro', () => {
      const { getByText } = renderAuth();
      expect(getByText('Não tem conta? Registre-se')).toBeInTheDocument();
    });

    it('deve ter link para recuperar senha', () => {
      const { getByText } = renderAuth();
      expect(getByText('Esqueceu sua senha?')).toBeInTheDocument();
    });
  });

  describe('Validação de formulário', () => {
    it('deve mostrar campos obrigatórios', () => {
      const { getByPlaceholderText } = renderAuth();
      
      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Senha');
      
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('deve ter validação de tamanho mínimo na senha', () => {
      const { getByPlaceholderText } = renderAuth();
      
      const passwordInput = getByPlaceholderText('Senha');
      expect(passwordInput).toHaveAttribute('minLength', '6');
    });
  });

  describe('Estrutura do Card', () => {
    it('deve renderizar Card com título e descrição', () => {
      const { getByText } = renderAuth();
      
      expect(getByText('Entrar')).toBeInTheDocument();
      expect(getByText('Entre para acessar seu Kanban')).toBeInTheDocument();
    });
  });

  describe('Inputs', () => {
    it('deve ter input de email do tipo email', () => {
      const { getByPlaceholderText } = renderAuth();
      const emailInput = getByPlaceholderText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('deve ter input de senha do tipo password', () => {
      const { getByPlaceholderText } = renderAuth();
      const passwordInput = getByPlaceholderText('Senha');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Botões', () => {
    it('deve ter botão de submit', () => {
      const { getByRole } = renderAuth();
      const submitButton = getByRole('button', { name: 'Entrar' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('deve ter botão para alternar modo', () => {
      const { getByText } = renderAuth();
      const toggleButton = getByText('Não tem conta? Registre-se');
      expect(toggleButton).toBeInTheDocument();
    });
  });
});
