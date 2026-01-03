/**
 * Tipos centralizados do projeto
 * Este arquivo contém interfaces e tipos reutilizados em múltiplos arquivos
 */

// ============= Tipos para Sync Offline =============

export interface QueuedOperation {
  id: string;
  type: "task" | "note" | "category";
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

// ============= Tipos para Subtasks =============

export interface SubtaskData {
  id: string;
  title: string;
  completed: boolean;
}

// ============= Tipos para Recorrência =============

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  count?: number;
}

// ============= Tipos para Lixeira (Trash) =============

export interface TrashNoteData {
  id: string;
  title: string;
  content?: string | null;
  notebook_id?: string | null;
  is_pinned?: boolean;
  color?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TrashNotebookData {
  notebook: {
    id: string;
    name: string;
    user_id: string;
    tags?: string[] | null;
    created_at: string;
    updated_at: string;
  };
  notes: TrashNoteData[];
}

export type TrashItemData = TrashNoteData | TrashNotebookData;

export interface TrashItem {
  id: string;
  item_type: "note" | "notebook";
  item_id: string;
  item_data: TrashItemData;
  deleted_at: string;
  user_id: string;
}

// ============= Tipos para Settings =============

export interface SettingsWithFilterPresets {
  theme?: "light" | "dark" | "auto";
  defaultDensity?: "comfortable" | "compact" | "ultra-compact";
  timezone?: string;
  notifications?: NotificationSettings;
  kanban?: KanbanSettings;
  productivity?: ProductivitySettings;
  interface?: InterfaceSettings;
  mobile?: MobileSettings;
  customization?: CustomizationSettings;
  aiPrompts?: Record<string, string>;
  notificationTemplates?: NotificationTemplateData[];
  calendarDueDateFilter?: string;
  filterPresets?: FilterPresetsData;
}

export interface NotificationSettings {
  dueDate: boolean;
  achievements: boolean;
  sound: boolean;
  dueDateHours: number;
  checkInterval: 5 | 15 | 30 | 60;
  snoozeMinutes: number;
}

export interface KanbanSettings {
  autoReset: boolean;
  resetTime: string;
  defaultColumn: string;
  maxTasksPerColumn: number;
  allowCrossCategoryDrag: boolean;
  showFavoritesPanel: boolean;
  dailySortOption: "time" | "name" | "priority";
  dailySortOrder: "asc" | "desc";
  projectsSortOption: "manual" | "date_asc" | "date_desc" | "name_asc" | "name_desc" | "priority_asc" | "priority_desc";
  projectsSortOrder: "asc" | "desc";
  simplifiedMode: boolean;
  hideCompletedTasks: boolean;
  dailyDueDateFilter: string;
  projectsDueDateFilter: string;
  autoMoveToCurrentWeek: boolean;
  defaultView: "daily" | "projects";
}

export interface ProductivitySettings {
  dailyGoal: number;
  pomodoroEnabled: boolean;
  pomodoroDuration: number;
  dailyReviewEnabled: boolean;
  dailyReviewLastShown: string | null;
  autoResetDailyStats: boolean;
}

export interface InterfaceSettings {
  sidebarPosition: "left" | "right";
  language: "pt-BR" | "en" | "es";
}

export interface MobileSettings {
  dailyGridColumns: 1 | 2;
  projectsGridColumns: 1 | 2;
  hideBadges: boolean;
}

export interface CustomizationSettings {
  priorityColors?: {
    high: { background: string; text: string };
    medium: { background: string; text: string };
    low: { background: string; text: string };
  };
}

export interface NotificationTemplateData {
  id: string;
  name: string;
  title: string;
  body: string;
  type: string;
}

// ============= Tipos para Filter Presets =============

export interface FilterPresetFilters {
  searchTerm?: string;
  priorityFilter?: string;
  tagFilter?: string;
  categoryFilter?: string[];
  displayMode?: string;
  sortOption?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  icon?: string;
  filters: FilterPresetFilters;
  createdAt: string;
  updatedAt: string;
}

export interface FilterPresetsData {
  presets: FilterPreset[];
  activePresetId?: string;
}

// ============= Tipos para Tarefas do Supabase (queries) =============

export interface TaskWithCategory {
  id: string;
  mirror_task_id: string | null;
  categories: {
    name: string;
  } | null;
}

// ============= Tipos para DateTime SP =============

export interface DateTimeSP {
  date: number;
  time: number;
}
