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

import { getTimezone } from '@/lib/dateUtils';

export interface RecurrenceRule {
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  weekday?: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado (legacy - único dia)
  weekdays?: number[]; // NOVO: array de dias [1, 4] = Segunda e Quinta
}

/**
 * Obtém a data/hora atual no timezone configurado do usuário.
 * Isso evita o bug onde às 21h de quinta no Brasil (UTC-3),
 * new Date().getDay() retorna 5 (sexta em UTC).
 */
function getNowInTimezone(): Date {
  const now = new Date();
  const tz = getTimezone();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  return new Date(
    parseInt(getValue('year')),
    parseInt(getValue('month')) - 1,
    parseInt(getValue('day')),
    parseInt(getValue('hour')),
    parseInt(getValue('minute')),
    parseInt(getValue('second'))
  );
}

/**
 * Cria uma data ISO string preservando o horário original.
 * Usa coordenadas locais (não UTC) pois getNowInTimezone já retorna local.
 */
function createDateWithTime(date: Date, hours: number, minutes: number, seconds: number): string {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds
  )).toISOString();
}

/**
 * Calcula a próxima data de recorrência baseada na regra configurada.
 * Usa o timezone do usuário para evitar bugs com UTC.
 */
export function calculateNextRecurrenceDate(
  currentDueDate: string | null,
  recurrenceRule: RecurrenceRule | null
): string {
  const now = getNowInTimezone();
  
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
  
  // MODO 1: Por dias da semana (suporta array ou valor único)
  const weekdays = recurrenceRule.weekdays || 
    (recurrenceRule.weekday !== undefined && recurrenceRule.weekday !== null ? [recurrenceRule.weekday] : null);
  
  if (weekdays && weekdays.length > 0) {
    const currentDay = now.getDay();
    const sortedDays = [...weekdays].sort((a, b) => a - b);
    
    // Encontrar o próximo dia na lista
    let nextDay = sortedDays.find(d => d > currentDay);
    let daysToAdd = 0;
    
    if (nextDay !== undefined) {
      daysToAdd = nextDay - currentDay;
    } else {
      // Próxima semana, primeiro dia da lista
      daysToAdd = 7 - currentDay + sortedDays[0];
    }
    
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
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
