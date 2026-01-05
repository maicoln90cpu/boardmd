import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  FileText, 
  Calendar, 
  Inbox, 
  Search, 
  Filter,
  Plus,
  Sparkles,
  FolderOpen,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";

type EmptyStateVariant = 
  | "tasks" 
  | "notes" 
  | "calendar" 
  | "search" 
  | "filter" 
  | "column" 
  | "notebooks"
  | "pomodoro";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const variants = {
  tasks: {
    icon: ClipboardList,
    title: "Nenhuma tarefa ainda",
    description: "Crie sua primeira tarefa e comece a organizar seu dia!",
    actionLabel: "Criar tarefa",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  notes: {
    icon: FileText,
    title: "Nenhuma nota aqui",
    description: "Anote suas ideias, lembretes e informações importantes.",
    actionLabel: "Nova nota",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  calendar: {
    icon: Calendar,
    title: "Dia livre!",
    description: "Nenhuma tarefa agendada para esta data. Aproveite ou planeje algo novo.",
    actionLabel: "Agendar tarefa",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  search: {
    icon: Search,
    title: "Nenhum resultado",
    description: "Tente buscar por outros termos ou verifique a ortografia.",
    actionLabel: "Limpar busca",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  filter: {
    icon: Filter,
    title: "Nenhuma tarefa encontrada",
    description: "Os filtros aplicados não retornaram resultados. Tente ajustar os critérios.",
    actionLabel: "Limpar filtros",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  column: {
    icon: Inbox,
    title: "Coluna vazia",
    description: "Arraste tarefas para cá ou crie uma nova.",
    actionLabel: "Nova tarefa",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  notebooks: {
    icon: FolderOpen,
    title: "Nenhum caderno",
    description: "Organize suas notas em cadernos temáticos.",
    actionLabel: "Criar caderno",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  pomodoro: {
    icon: Clock,
    title: "Sem sessões",
    description: "Comece uma sessão Pomodoro para focar nas suas tarefas.",
    actionLabel: "Iniciar sessão",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      {/* Illustrated Icon */}
      <div className={`relative mb-6`}>
        <div className={`p-6 rounded-full ${config.bgColor}`}>
          <Icon className={`h-12 w-12 ${config.color}`} />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </motion.div>
      </div>

      {/* Text Content */}
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {description || config.description}
      </p>

      {/* CTA Button */}
      {onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel || config.actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

// Compact version for columns
export function EmptyStateCompact({
  variant,
  onAction,
}: {
  variant: EmptyStateVariant;
  onAction?: () => void;
}) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
    >
      <div className={`p-3 rounded-full ${config.bgColor} mb-3`}>
        <Icon className={`h-6 w-6 ${config.color}`} />
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {config.title}
      </p>
      {onAction && (
        <Button variant="ghost" size="sm" onClick={onAction} className="gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      )}
    </motion.div>
  );
}
