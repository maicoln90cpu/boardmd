import { describe, it, expect } from 'vitest';
import { 
  phoneSchema, 
  emailSchema, 
  nameSchema, 
  passwordSchema,
  taskSchema,
  categorySchema,
  columnSchema,
  profileSchema,
  signUpSchema,
  signInSchema
} from '@/lib/validations';

describe('Validations', () => {
  describe('phoneSchema', () => {
    it('deve aceitar telefone com 10 dígitos', () => {
      const result = phoneSchema.safeParse('11987654321');
      expect(result.success).toBe(true);
    });

    it('deve aceitar telefone com 11 dígitos', () => {
      const result = phoneSchema.safeParse('11987654321');
      expect(result.success).toBe(true);
    });

    it('deve aceitar string vazia', () => {
      const result = phoneSchema.safeParse('');
      expect(result.success).toBe(true);
    });

    it('deve remover caracteres não numéricos', () => {
      const result = phoneSchema.safeParse('(11) 98765-4321');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('11987654321');
      }
    });

    it('deve rejeitar telefone com menos de 10 dígitos', () => {
      const result = phoneSchema.safeParse('123456789');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar DDD inválido (começando com 0)', () => {
      const result = phoneSchema.safeParse('01987654321');
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('deve aceitar email válido', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('deve converter para minúsculas', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('deve remover espaços', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('deve rejeitar email inválido', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar email muito longo', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('deve aceitar nome válido', () => {
      const result = nameSchema.safeParse('João Silva');
      expect(result.success).toBe(true);
    });

    it('deve aceitar nome com acentos', () => {
      const result = nameSchema.safeParse('José María García');
      expect(result.success).toBe(true);
    });

    it('deve aceitar nome com hífen', () => {
      const result = nameSchema.safeParse("Anne-Marie O'Connor");
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const result = nameSchema.safeParse('A');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito longo', () => {
      const longName = 'a'.repeat(101);
      const result = nameSchema.safeParse(longName);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome com números', () => {
      const result = nameSchema.safeParse('João123');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome com caracteres especiais', () => {
      const result = nameSchema.safeParse('João@Silva');
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('deve aceitar senha com 6+ caracteres', () => {
      const result = passwordSchema.safeParse('123456');
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senha curta', () => {
      const result = passwordSchema.safeParse('12345');
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha muito longa', () => {
      const longPassword = 'a'.repeat(101);
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('taskSchema', () => {
    const validTask = {
      title: 'Minha Tarefa',
      column_id: '550e8400-e29b-41d4-a716-446655440000',
      category_id: '550e8400-e29b-41d4-a716-446655440001',
    };

    it('deve aceitar tarefa válida', () => {
      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título vazio', () => {
      const result = taskSchema.safeParse({ ...validTask, title: '' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar título muito longo', () => {
      const result = taskSchema.safeParse({ ...validTask, title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('deve aceitar prioridades válidas', () => {
      ['low', 'medium', 'high'].forEach(priority => {
        const result = taskSchema.safeParse({ ...validTask, priority });
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar prioridade inválida', () => {
      const result = taskSchema.safeParse({ ...validTask, priority: 'urgent' });
      expect(result.success).toBe(false);
    });

    it('deve aceitar descrição nula', () => {
      const result = taskSchema.safeParse({ ...validTask, description: null });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar descrição muito longa', () => {
      const result = taskSchema.safeParse({ ...validTask, description: 'a'.repeat(2001) });
      expect(result.success).toBe(false);
    });

    it('deve aceitar tags válidas', () => {
      const result = taskSchema.safeParse({ ...validTask, tags: ['trabalho', 'urgente'] });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar mais de 20 tags', () => {
      const manyTags = Array(21).fill('tag');
      const result = taskSchema.safeParse({ ...validTask, tags: manyTags });
      expect(result.success).toBe(false);
    });

    it('deve aceitar subtarefas válidas', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        subtasks: [
          { id: '1', title: 'Subtarefa 1', completed: false },
          { id: '2', title: 'Subtarefa 2', completed: true },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar mais de 50 subtarefas', () => {
      const manySubtasks = Array(51).fill(null).map((_, i) => ({
        id: String(i),
        title: `Subtarefa ${i}`,
        completed: false,
      }));
      const result = taskSchema.safeParse({ ...validTask, subtasks: manySubtasks });
      expect(result.success).toBe(false);
    });

    it('deve aceitar recurrence_rule válido com frequência', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        recurrence_rule: { frequency: 'daily', interval: 1 },
      });
      expect(result.success).toBe(true);
    });

    it('deve aceitar recurrence_rule válido com weekday', () => {
      const result = taskSchema.safeParse({
        ...validTask,
        recurrence_rule: { weekday: 1 }, // Segunda-feira
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar column_id inválido', () => {
      const result = taskSchema.safeParse({ ...validTask, column_id: 'invalid-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('categorySchema', () => {
    it('deve aceitar categoria válida', () => {
      const result = categorySchema.safeParse({ name: 'Trabalho' });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome vazio', () => {
      const result = categorySchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito longo', () => {
      const result = categorySchema.safeParse({ name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('columnSchema', () => {
    it('deve aceitar coluna válida', () => {
      const result = columnSchema.safeParse({ name: 'A Fazer', position: 0 });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome vazio', () => {
      const result = columnSchema.safeParse({ name: '', position: 0 });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar posição negativa', () => {
      const result = columnSchema.safeParse({ name: 'Coluna', position: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('profileSchema', () => {
    it('deve aceitar perfil válido', () => {
      const result = profileSchema.safeParse({
        name: 'João Silva',
        phone: '11987654321',
      });
      expect(result.success).toBe(true);
    });

    it('deve aceitar perfil sem telefone', () => {
      const result = profileSchema.safeParse({
        name: 'João Silva',
      });
      expect(result.success).toBe(true);
    });

    it('deve aceitar telefone vazio', () => {
      const result = profileSchema.safeParse({
        name: 'João Silva',
        phone: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('signUpSchema', () => {
    const validSignUp = {
      email: 'test@example.com',
      password: '123456',
      confirmPassword: '123456',
      name: 'João Silva',
    };

    it('deve aceitar registro válido', () => {
      const result = signUpSchema.safeParse(validSignUp);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senhas diferentes', () => {
      const result = signUpSchema.safeParse({
        ...validSignUp,
        confirmPassword: 'different',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('deve rejeitar email inválido', () => {
      const result = signUpSchema.safeParse({
        ...validSignUp,
        email: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('deve aceitar registro com telefone', () => {
      const result = signUpSchema.safeParse({
        ...validSignUp,
        phone: '11987654321',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('signInSchema', () => {
    it('deve aceitar login válido', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'mypassword',
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const result = signInSchema.safeParse({
        email: 'invalid',
        password: 'mypassword',
      });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha vazia', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
