/**
 * Centralized column styling utilities
 * Consolidates all column color/style functions in one place
 */

// Cores vibrantes para a barra superior das colunas (estilo KanbanFlow)
export const COLUMN_COLORS = [
  { name: "Padrão", value: null, preview: "bg-muted", bar: "bg-muted" },
  { name: "Azul", value: "blue", preview: "bg-blue-500", bar: "bg-blue-500" },
  { name: "Verde", value: "green", preview: "bg-emerald-500", bar: "bg-emerald-500" },
  { name: "Amarelo", value: "yellow", preview: "bg-amber-400", bar: "bg-amber-400" },
  { name: "Laranja", value: "orange", preview: "bg-orange-500", bar: "bg-orange-500" },
  { name: "Vermelho", value: "red", preview: "bg-red-500", bar: "bg-red-500" },
  { name: "Roxo", value: "purple", preview: "bg-violet-500", bar: "bg-violet-500" },
  { name: "Rosa", value: "pink", preview: "bg-pink-500", bar: "bg-pink-500" },
  { name: "Ciano", value: "cyan", preview: "bg-cyan-500", bar: "bg-cyan-500" },
] as const;

export type ColumnColorValue = typeof COLUMN_COLORS[number]["value"];

// Mapa de cores para barra superior
const TOP_BAR_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  purple: "bg-violet-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

// Mapa de cores para fundo da coluna
const BACKGROUND_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950/20",
  green: "bg-emerald-50 dark:bg-emerald-950/20",
  yellow: "bg-amber-50 dark:bg-amber-950/20",
  orange: "bg-orange-50 dark:bg-orange-950/20",
  red: "bg-red-50 dark:bg-red-950/20",
  purple: "bg-violet-50 dark:bg-violet-950/20",
  pink: "bg-pink-50 dark:bg-pink-950/20",
  cyan: "bg-cyan-50 dark:bg-cyan-950/20",
};

/**
 * Retorna a classe CSS para a BARRA COLORIDA no topo da coluna (4px)
 */
export function getColumnTopBarClass(color: string | null | undefined): string {
  if (!color) return "bg-muted";
  return TOP_BAR_COLOR_MAP[color] || "bg-muted";
}

/**
 * Retorna a classe CSS para o FUNDO SUAVE da coluna (matching top bar color)
 */
export function getColumnBackgroundClass(color: string | null | undefined): string {
  if (!color) return "bg-card";
  return BACKGROUND_COLOR_MAP[color] || "bg-card";
}

/**
 * @deprecated Use getColumnTopBarClass instead
 */
export function getColumnColorClass(color: string | null | undefined): string {
  return "bg-card";
}

/**
 * Retorna todas as classes de estilo de uma coluna de uma vez
 */
export function getColumnStyles(color: string | null | undefined) {
  return {
    topBar: getColumnTopBarClass(color),
    background: getColumnBackgroundClass(color),
  };
}
