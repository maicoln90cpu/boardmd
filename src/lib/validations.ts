import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "O título não pode estar vazio")
    .max(200, "O título deve ter menos de 200 caracteres"),
  description: z.string()
    .max(2000, "A descrição deve ter menos de 2000 caracteres")
    .nullable()
    .optional(),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: "Prioridade deve ser baixa, média ou alta" })
  }).default('medium'),
  due_date: z.string().nullable().optional(),
  tags: z.array(z.string().max(50))
    .max(20, "Máximo de 20 tags permitidas")
    .nullable()
    .optional(),
  column_id: z.string().uuid("ID de coluna inválido"),
  category_id: z.string().uuid("ID de categoria inválido"),
  position: z.number().int().min(0).optional(),
  user_id: z.string().uuid("ID de usuário inválido").optional()
});

export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, "O nome da categoria não pode estar vazio")
    .max(100, "O nome da categoria deve ter menos de 100 caracteres"),
  user_id: z.string().uuid("ID de usuário inválido").optional()
});

export const columnSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "O nome da coluna não pode estar vazio")
    .max(100, "O nome da coluna deve ter menos de 100 caracteres"),
  position: z.number().int().min(0),
  user_id: z.string().uuid("ID de usuário inválido").optional()
});
