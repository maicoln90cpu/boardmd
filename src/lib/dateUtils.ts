// Utilitários de data padronizados para timezone UTC-3 (São Paulo)

const TIMEZONE = "America/Sao_Paulo";

/**
 * Formata data e hora completas para pt-BR no timezone de São Paulo
 */
export const formatDateTimeBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", { timeZone: TIMEZONE });
};

/**
 * Formata apenas a data para pt-BR no timezone de São Paulo
 */
export const formatDateOnlyBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: TIMEZONE });
};

/**
 * Formata data curta (dia/mês) para pt-BR no timezone de São Paulo
 */
export const formatDateShortBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  });
};

/**
 * Formata apenas o horário para pt-BR no timezone de São Paulo
 */
export const formatTimeOnlyBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    timeZone: TIMEZONE,
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
  
  // Converter para timezone de São Paulo para comparação
  const dateInSP = new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const nowInSP = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  
  const isToday =
    dateInSP.getDate() === nowInSP.getDate() &&
    dateInSP.getMonth() === nowInSP.getMonth() &&
    dateInSP.getFullYear() === nowInSP.getFullYear();
    
  const tomorrow = new Date(nowInSP);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isTomorrow =
    dateInSP.getDate() === tomorrow.getDate() &&
    dateInSP.getMonth() === tomorrow.getMonth() &&
    dateInSP.getFullYear() === tomorrow.getFullYear();

  if (isToday) return "Hoje";
  if (isTomorrow) return "Amanhã";
  
  return formatDateOnlyBR(d);
};

/**
 * Retorna a data atual no timezone de São Paulo
 */
export const getNowInSaoPaulo = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
};

/**
 * Formata data para exibição no calendário
 */
export const formatCalendarDateBR = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};
