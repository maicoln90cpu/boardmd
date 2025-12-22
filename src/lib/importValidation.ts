import { z } from 'zod';

// Schema para subtask no import
const importSubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean()
}).passthrough();

// Schema para recurrence_rule no import
const importRecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  interval: z.number().optional(),
  weekday: z.number().optional()
}).passthrough().nullable().optional();

// Schema para categoria importada
const importCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  position: z.number().optional(),
  user_id: z.string().optional(),
  created_at: z.string().optional()
}).passthrough();

// Schema para tarefa importada
const importTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Título da tarefa é obrigatório"),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  due_date: z.string().nullable().optional(),
  column_id: z.string(),
  category_id: z.string(),
  position: z.number().optional().default(0),
  user_id: z.string().optional(),
  tags: z.array(z.string()).nullable().optional(),
  subtasks: z.array(importSubtaskSchema).nullable().optional(),
  recurrence_rule: importRecurrenceSchema,
  is_completed: z.boolean().optional().default(false),
  is_favorite: z.boolean().optional().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
}).passthrough();

// Schema principal do arquivo de importação
export const importFileSchema = z.object({
  categories: z.array(importCategorySchema).optional().default([]),
  tasks: z.array(importTaskSchema).optional().default([]),
  exportDate: z.string().optional()
}).passthrough();

export type ImportCategory = z.infer<typeof importCategorySchema>;
export type ImportTask = z.infer<typeof importTaskSchema>;
export type ImportFileData = z.infer<typeof importFileSchema>;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: ImportFileData | null;
  stats: {
    totalCategories: number;
    totalTasks: number;
    validCategories: number;
    validTasks: number;
    newCategories: number;
    newTasks: number;
    duplicateCategories: number;
    duplicateTasks: number;
  };
}

export interface MergeResult {
  categoriesToAdd: ImportCategory[];
  tasksToAdd: ImportTask[];
  skippedCategories: string[];
  skippedTasks: string[];
}

/**
 * Valida o arquivo JSON de importação
 */
export function validateImportFile(
  fileContent: string,
  existingCategories: Array<{ id: string; name: string }>,
  existingTasks: Array<{ id: string; title: string; category_id: string }>
): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    data: null,
    stats: {
      totalCategories: 0,
      totalTasks: 0,
      validCategories: 0,
      validTasks: 0,
      newCategories: 0,
      newTasks: 0,
      duplicateCategories: 0,
      duplicateTasks: 0
    }
  };

  // 1. Tentar fazer parse do JSON
  let parsedData: unknown;
  try {
    parsedData = JSON.parse(fileContent);
  } catch (e) {
    result.errors.push("Arquivo JSON inválido: não foi possível fazer parse do conteúdo");
    return result;
  }

  // 2. Validar estrutura com Zod
  const zodResult = importFileSchema.safeParse(parsedData);
  if (!zodResult.success) {
    result.errors.push("Estrutura do arquivo inválida:");
    zodResult.error.errors.forEach(err => {
      result.errors.push(`  - ${err.path.join('.')}: ${err.message}`);
    });
    return result;
  }

  const data = zodResult.data;
  result.data = data;

  // 3. Contabilizar totais
  result.stats.totalCategories = data.categories.length;
  result.stats.totalTasks = data.tasks.length;

  // 4. Verificar duplicatas de categorias
  const existingCatNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
  data.categories.forEach(cat => {
    if (existingCatNames.has(cat.name.toLowerCase())) {
      result.stats.duplicateCategories++;
      result.warnings.push(`Categoria "${cat.name}" já existe e será ignorada`);
    } else {
      result.stats.newCategories++;
      result.stats.validCategories++;
    }
  });

  // 5. Verificar duplicatas de tarefas (por título + categoria)
  const existingTaskKeys = new Set(
    existingTasks.map(t => `${t.title.toLowerCase()}|${t.category_id}`)
  );
  data.tasks.forEach(task => {
    const key = `${task.title.toLowerCase()}|${task.category_id}`;
    if (existingTaskKeys.has(key)) {
      result.stats.duplicateTasks++;
      result.warnings.push(`Tarefa "${task.title}" já existe nesta categoria e será ignorada`);
    } else {
      result.stats.newTasks++;
      result.stats.validTasks++;
    }
  });

  // 6. Avisos adicionais
  if (data.categories.some(c => c.name === "Diário")) {
    result.warnings.push("Categoria 'Diário' será ignorada para evitar duplicação");
  }

  if (result.stats.totalCategories === 0 && result.stats.totalTasks === 0) {
    result.errors.push("Arquivo não contém categorias nem tarefas para importar");
    return result;
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Prepara os dados para merge inteligente (apenas itens novos)
 */
export function prepareMergeData(
  data: ImportFileData,
  existingCategories: Array<{ id: string; name: string }>,
  existingTasks: Array<{ id: string; title: string; category_id: string }>
): MergeResult {
  const existingCatNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
  const existingTaskKeys = new Set(
    existingTasks.map(t => `${t.title.toLowerCase()}|${t.category_id}`)
  );

  const result: MergeResult = {
    categoriesToAdd: [],
    tasksToAdd: [],
    skippedCategories: [],
    skippedTasks: []
  };

  // Filtrar categorias novas (excluindo "Diário")
  data.categories.forEach(cat => {
    if (cat.name === "Diário") {
      result.skippedCategories.push(cat.name);
    } else if (existingCatNames.has(cat.name.toLowerCase())) {
      result.skippedCategories.push(cat.name);
    } else {
      result.categoriesToAdd.push(cat);
    }
  });

  // Filtrar tarefas novas
  data.tasks.forEach(task => {
    const key = `${task.title.toLowerCase()}|${task.category_id}`;
    if (existingTaskKeys.has(key)) {
      result.skippedTasks.push(task.title);
    } else {
      result.tasksToAdd.push(task);
    }
  });

  return result;
}
