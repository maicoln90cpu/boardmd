/**
 * Utilitário centralizado para cálculos de recorrência de tarefas
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
 * Calcula a próxima data de recorrência baseada na regra configurada
 * 
 * @param currentDueDate - Data atual da tarefa (ISO string)
 * @param recurrenceRule - Regra de recorrência (frequência ou dia da semana)
 * @returns Nova data ISO string
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
