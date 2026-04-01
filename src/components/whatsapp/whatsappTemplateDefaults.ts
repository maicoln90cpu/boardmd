export interface WhatsAppTemplate {
  id?: string;
  template_type: string;
  message_template: string;
  is_enabled: boolean;
  label: string;
  variables: string[];
  send_time: string;
  send_time_2?: string;
  due_date_hours_before?: number;
  due_date_hours_before_2?: number;
  excluded_column_ids: string[];
}

export interface WhatsAppColumn {
  id: string;
  name: string;
}

// Templates de evento (sem campo de horário)
export const EVENT_TEMPLATES = ["pomodoro", "achievement", "task_completed", "goal_reached"];
// Templates where the edge function builds the message directly
export const AUTO_GENERATED_TEMPLATES = ["daily_motivation", "daily_reminder", "daily_report"];
// Templates de horário fixo
export const FIXED_TIME_TEMPLATES = [
  "daily_reminder",
  "daily_report",
  "daily_motivation",
  "weekly_summary",
];
// Template dinâmico (horas antes)
export const DYNAMIC_TEMPLATES = ["due_date"];
// Templates com cron que também verificam overdue
export const CRON_EVENT_TEMPLATES = ["task_overdue"];
// Templates com filtro de colunas
export const COLUMN_FILTER_TEMPLATES = [
  "due_date",
  "daily_reminder",
  "daily_report",
  "daily_motivation",
  "weekly_summary",
  "task_completed",
  "task_overdue",
];

export const WEEKDAYS = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export const DEFAULT_TEMPLATES: Omit<WhatsAppTemplate, "id">[] = [
  {
    template_type: "due_date",
    label: "⏰ Tarefa Vencendo",
    message_template:
      '⏰ *Alerta de Prazo*\n\nA tarefa "{{taskTitle}}" vence em {{timeRemaining}}.\n\nAcesse o TaskFlow para gerenciar.',
    is_enabled: true,
    variables: ["taskTitle", "timeRemaining"],
    send_time: "",
    send_time_2: "",
    due_date_hours_before: 24,
    due_date_hours_before_2: 2,
    excluded_column_ids: [],
  },
  {
    template_type: "daily_reminder",
    label: "📋 Resumo Diário (manhã)",
    message_template:
      "📋 *Tarefas de Hoje*\n\n• Tarefa A | 09:00\n• Tarefa B | 14:00\n\n⚠️ *Tarefas Atrasadas*\n🔴 Tarefa X | Desde: 09/02\n\nEnviado em 2 blocos separados: tarefas do dia + atrasadas",
    is_enabled: true,
    variables: [],
    send_time: "08:00",
    excluded_column_ids: [],
  },
  {
    template_type: "daily_report",
    label: "📊 Relatório de Produtividade (noite)",
    message_template:
      "📊 *Relatório do Dia*\n\n✅ Concluídas: 8\n❌ Não concluídas: 4\n📈 Taxa: 67%\n▓▓▓▓▓▓▓░░░ 67%\n\n🏆 Streak: 5 dias\n⭐ Pontos: 120\n\n🔥 *Destaques concluídos:*\n• ...\n\n💤 *Ficaram para amanhã:*\n• ...\n\nDescanse bem! 🌙",
    is_enabled: true,
    variables: [],
    send_time: "23:00",
    excluded_column_ids: [],
  },
  {
    template_type: "daily_motivation",
    label: "🌅 Bom Dia Motivacional",
    message_template:
      "☀️ *Bom dia!*\n\n💡 *Frase do dia:*\n{{motivationalQuote}}\n\n📖 *Palavra de Deus:*\n{{bibleQuote}}\n\nTenha um ótimo dia! 🙏",
    is_enabled: false,
    variables: ["motivationalQuote", "bibleQuote"],
    send_time: "07:00",
    excluded_column_ids: [],
  },
  {
    template_type: "weekly_summary",
    label: "📅 Resumo Semanal",
    message_template:
      "📅 *Resumo da Semana*\n\n✅ Concluídas: {{completedWeek}} tarefas\n📋 Pendentes: {{pendingTasks}}\n🔥 Sequência: {{streak}} dias\n📁 Categoria mais ativa: {{topCategory}}\n\nNova semana, novas conquistas! 🚀",
    is_enabled: false,
    variables: ["completedWeek", "pendingTasks", "streak", "topCategory"],
    send_time: "09:00",
    send_time_2: "1",
    excluded_column_ids: [],
  },
  {
    template_type: "task_completed",
    label: "✅ Tarefa Concluída",
    message_template:
      '🎉 *Parabéns!*\n\nVocê concluiu "{{taskTitle}}"!\nJá são {{completedCount}} tarefas hoje. Restam {{pendingCount}} pendentes.\n\nContinue assim! 💪',
    is_enabled: false,
    variables: ["taskTitle", "completedCount", "pendingCount"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "task_overdue",
    label: "🚨 Tarefa Atrasada",
    message_template:
      '🚨 *Atenção!*\n\nA tarefa "{{taskTitle}}" está atrasada há {{overdueTime}}.\nVocê tem {{totalOverdue}} tarefa(s) atrasada(s) no total.\n\nAcesse o TaskFlow para resolver.',
    is_enabled: false,
    variables: ["taskTitle", "overdueTime", "totalOverdue"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "goal_reached",
    label: "🏆 Meta Atingida",
    message_template:
      '🏆 *Meta Atingida!*\n\n"{{goalTitle}}" - {{target}} tarefas no período {{period}}.\n\nVocê é incrível! 🎉',
    is_enabled: false,
    variables: ["goalTitle", "target", "period"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "pomodoro",
    label: "🍅 Pomodoro",
    message_template: "🍅 *Pomodoro {{sessionType}}*\n\n{{message}}\n\nContinue focado!",
    is_enabled: false,
    variables: ["sessionType", "message"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "achievement",
    label: "🏅 Conquista",
    message_template:
      "🏆 *Nova Conquista!*\n\n{{achievementTitle}}\n+{{points}} pontos\n\nParabéns! 🎉",
    is_enabled: false,
    variables: ["achievementTitle", "points"],
    send_time: "",
    excluded_column_ids: [],
  },
];

export const SAMPLE_VARIABLES: Record<string, string> = {
  taskTitle: "Tarefa de Exemplo",
  timeRemaining: "2 horas",
  pendingTasks: "5",
  overdueText: "⚠️ 2 tarefa(s) atrasada(s)",
  sessionType: "Foco",
  message: "Hora de voltar ao trabalho!",
  achievementTitle: "Mestre da Produtividade",
  points: "100",
  completedCount: "3",
  pendingCount: "7",
  completedWeek: "22",
  streak: "5",
  topCategory: "Trabalho",
  goalTitle: "Meta Semanal",
  target: "10",
  period: "semanal",
  overdueTime: "3 horas",
  totalOverdue: "2",
};
