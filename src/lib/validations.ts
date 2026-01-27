import { z } from 'zod';

// Schema para validação de telefone brasileiro
export const phoneSchema = z.string()
  .transform(val => val.replace(/\D/g, '')) // Remove não-dígitos
  .refine(val => val === '' || (val.length >= 10 && val.length <= 11), {
    message: "Telefone deve ter 10 ou 11 dígitos (com DDD)"
  })
  .refine(val => val === '' || /^[1-9][0-9]/.test(val), {
    message: "DDD inválido"
  });

// Schema para validação de email
export const emailSchema = z.string()
  .trim()
  .email("Email inválido")
  .max(255, "Email deve ter menos de 255 caracteres")
  .transform(val => val.toLowerCase());

// Schema para validação de nome
export const nameSchema = z.string()
  .trim()
  .min(2, "Nome deve ter no mínimo 2 caracteres")
  .max(100, "Nome deve ter menos de 100 caracteres")
  .refine(val => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(val), {
    message: "Nome contém caracteres inválidos"
  });

// Schema para validação de senha
export const passwordSchema = z.string()
  .min(6, "Senha deve ter no mínimo 6 caracteres")
  .max(100, "Senha deve ter menos de 100 caracteres");

// Schema para subtarefas
const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, "Título da subtarefa não pode estar vazio").max(200),
  completed: z.boolean()
});

// Schema para recorrência - suporta frequência OU dia da semana
const recurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  interval: z.number().int().min(1).max(365).optional(),
  weekday: z.number().int().min(0).max(6).optional(), // 0=Dom, 1=Seg, ..., 6=Sáb (legacy)
  weekdays: z.array(z.number().int().min(0).max(6)).optional() // [0,1,4] = Dom, Seg, Qui (multi-select)
}).refine(data => {
  // Deve ter (frequency + interval) OU weekday OU weekdays[]
  const hasFrequency = data.frequency !== undefined && data.interval !== undefined;
  const hasWeekday = data.weekday !== undefined;
  const hasWeekdays = data.weekdays !== undefined && data.weekdays.length > 0;
  return hasFrequency || hasWeekday || hasWeekdays;
}, { message: "Deve ter frequência com intervalo ou dia da semana" });

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
  user_id: z.string().uuid("ID de usuário inválido").optional(),
  subtasks: z.array(subtaskSchema)
    .max(50, "Máximo de 50 subtarefas permitidas")
    .nullable()
    .optional(),
  recurrence_rule: recurrenceRuleSchema.nullable().optional(),
  is_completed: z.boolean().default(false).optional(),
  is_favorite: z.boolean().default(false).optional()
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

// Schema para perfil do usuário
export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional().or(z.literal(""))
});

// Schema para registro de usuário
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme sua senha"),
  name: nameSchema,
  phone: phoneSchema.optional().or(z.literal(""))
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para login
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória").max(100, "Senha muito longa")
});
