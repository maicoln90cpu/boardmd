/**
 * ============================================================================
 * UTILITÁRIO CENTRALIZADO PARA CÁLCULOS DE RECORRÊNCIA DE TAREFAS
 * ============================================================================
 * 
 * Este módulo contém a lógica ÚNICA para calcular a próxima data de recorrência.
 * É utilizado por TODOS os triggers de reset do sistema:
 * 
 * TRIGGERS QUE USAM ESTA FUNÇÃO:
 * 1. handleResetRecurrentTasks (Index.tsx) - Botão "Resetar Recorrentes"
 * 2. handleUncheckRecurrentTasks (KanbanBoard.tsx) - Botão ⟳ na coluna
 * 3. Edge Function reset-recurring-tasks - Cron Job às 23:59h (cópia local)
 * 
 * NOTA: A Edge Function tem uma cópia local desta função porque não pode
 * importar de src/. Ao modificar esta função, ATUALIZE TAMBÉM a cópia em:
 * supabase/functions/reset-recurring-tasks/index.ts
 * 
 * REGRAS DE NEGÓCIO:
 * - APENAS tarefas com is_completed === true são resetadas
 * - O cálculo usa DATA ATUAL (hoje) como base, NÃO a data original da tarefa
 * - O horário original da tarefa é PRESERVADO
 * - Sincronização bidirecional: atualiza mirror_task_id + reverse mirrors
 * 
 * MODOS DE RECORRÊNCIA (mutuamente exclusivos):
 * 1. Frequency-based: daily/weekly/monthly com interval (ex: a cada 2 semanas)
 * 2. Weekday-based: dia específico da semana (ex: toda segunda-feira)
 */

export interface RecurrenceRule {
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  weekday?: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
}

/**
 * Cria uma data ISO string preservando o horário original
 */
function createDateWithTime(date: Date, hours: number, minutes: number, seconds: number): string {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
    seconds
  )).toISOString();
}

/**
 * Calcula a próxima data de recorrência baseada na regra configurada.
 * 
 * IMPORTANTE: O cálculo é feito a partir de HOJE (data que a tarefa foi marcada
 * como concluída), NÃO da data original da tarefa. Isso garante que:
 * - Tarefas atrasadas não acumulem dias perdidos
 * - Daily com interval=1 marcada hoje aparece AMANHÃ
 * - Weekly marcada hoje aparece daqui 7 dias
 * 
 * @param currentDueDate - Data atual da tarefa (ISO string) - usado apenas para extrair horário
 * @param recurrenceRule - Regra de recorrência (frequência ou dia da semana)
 * @returns Nova data ISO string calculada a partir de HOJE + interval
 */
export function calculateNextRecurrenceDate(
  currentDueDate: string | null,
  recurrenceRule: RecurrenceRule | null
): string {
  const now = new Date();
  
  // Se não tem due_date, retornar data atual
  if (!currentDueDate) {
    return now.toISOString();
  }
  
  const baseDate = new Date(currentDueDate);
  const hours = baseDate.getUTCHours();
  const minutes = baseDate.getUTCMinutes();
  const seconds = baseDate.getUTCSeconds();
  
  // Se não tem regra de recorrência, apenas atualizar para hoje preservando horário
  if (!recurrenceRule || typeof recurrenceRule !== 'object') {
    return createDateWithTime(now, hours, minutes, seconds);
  }
  
  // MODO 1: Por dia da semana específico
  if (recurrenceRule.weekday !== undefined && recurrenceRule.weekday !== null) {
    const targetDay = recurrenceRule.weekday; // 0-6 (Domingo a Sábado)
    const nextDate = new Date(now);
    
    // Calcular dias até o próximo dia da semana desejado
    const currentDay = nextDate.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    // Se hoje é o dia ou já passou, agendar para próxima semana
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    return createDateWithTime(nextDate, hours, minutes, seconds);
  }
  
  // MODO 2: Por frequência (daily/weekly/monthly)
  // CORREÇÃO: Calcular a partir de HOJE (data que a tarefa foi riscada), não da data da tarefa
  const frequency = recurrenceRule.frequency || 'daily';
  const interval = recurrenceRule.interval || 1;
  
  // Usar a data ATUAL (hoje) como base para o cálculo
  // Isso garante que se a tarefa estava atrasada, ela volta para o futuro a partir de hoje
  const nextDate = new Date(now);
  
  switch (frequency) {
    case 'daily':
      // Adicionar intervalo à data de HOJE
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return createDateWithTime(nextDate, hours, minutes, seconds);
}

/**
 * Nomes dos dias da semana em português
 */
export const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

/**
 * Retorna o nome do dia da semana
 */
export function getWeekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] || '';
}
