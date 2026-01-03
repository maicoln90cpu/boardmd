// Utilitários de data padronizados - timezone configurável pelo usuário

// Timezone padrão (fallback)
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

// Função para obter o timezone atual do settings (via localStorage como fallback)
export const getTimezone = (): string => {
  try {
    // Tentar ler do localStorage onde o settings pode ter sido cacheado
    const settingsStr = localStorage.getItem('app-timezone');
    if (settingsStr) return settingsStr;
  } catch {
    // Ignorar erros de localStorage
  }
  return DEFAULT_TIMEZONE;
};

// Função para definir o timezone (chamada quando settings são carregados)
export const setTimezone = (timezone: string): void => {
  try {
    localStorage.setItem('app-timezone', timezone);
  } catch {
    // Ignorar erros de localStorage
  }
};

/**
 * Formata data e hora completas para pt-BR no timezone configurado
 */
export const formatDateTimeBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", { timeZone: getTimezone() });
};

/**
 * Formata apenas a data para pt-BR no timezone configurado
 */
export const formatDateOnlyBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: getTimezone() });
};

/**
 * Formata data curta (dia/mês) para pt-BR no timezone configurado
 */
export const formatDateShortBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    timeZone: getTimezone(),
    day: "2-digit",
    month: "2-digit",
  });
};

/**
 * Formata apenas o horário para pt-BR no timezone configurado
 */
export const formatTimeOnlyBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    timeZone: getTimezone(),
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formata data relativa (hoje, amanhã, data completa)
 */
export const formatRelativeDateBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const tz = getTimezone();
  
  // Converter para timezone configurado para comparação
  const dateInTZ = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  const nowInTZ = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  const isToday =
    dateInTZ.getDate() === nowInTZ.getDate() &&
    dateInTZ.getMonth() === nowInTZ.getMonth() &&
    dateInTZ.getFullYear() === nowInTZ.getFullYear();
    
  const tomorrow = new Date(nowInTZ);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isTomorrow =
    dateInTZ.getDate() === tomorrow.getDate() &&
    dateInTZ.getMonth() === tomorrow.getMonth() &&
    dateInTZ.getFullYear() === tomorrow.getFullYear();

  if (isToday) return "Hoje";
  if (isTomorrow) return "Amanhã";
  
  return formatDateOnlyBR(d);
};

/**
 * Retorna a data atual no timezone configurado
 */
export const getNowInTimezone = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: getTimezone() }));
};

// Alias para compatibilidade
export const getNowInSaoPaulo = getNowInTimezone;

/**
 * Formata data para exibição no calendário
 */
export const formatCalendarDateBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    timeZone: getTimezone(),
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

// ============= Tipos para DateTime =============

export interface DateTimeParsed {
  date: number;
  time: number;
}

/**
 * Extrai data e hora como números para ordenação
 * @param dateStr - String de data ISO ou null
 * @param defaultValue - Valor padrão quando dateStr é null (usar Infinity para ordenação)
 * @returns Objeto com date (YYYYMMDD) e time (minutos desde meia-noite)
 */
export const parseDateTimeForSort = (
  dateStr: string | null,
  defaultValue: number = Number.POSITIVE_INFINITY
): DateTimeParsed => {
  if (!dateStr) return { date: defaultValue, time: defaultValue };

  const date = new Date(dateStr);
  const tz = getTimezone();

  const dateOnlyStr = date.toLocaleDateString("pt-BR", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [day, month, year] = dateOnlyStr.split("/").map(Number);
  const dateNum = year * 10000 + month * 100 + day;

  const timeStr = date.toLocaleTimeString("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [hours, minutes] = timeStr.split(":").map(Number);
  return { date: dateNum, time: hours * 60 + minutes };
};

// Alias para compatibilidade com código existente
export const getDateTimeSP = parseDateTimeForSort;
