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
