import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Star, 
  StarOff,
  Plus,
  Minus,
  Play,
  Pause,
  CheckCircle2,
  Clock
} from "lucide-react";
import type { Course } from "@/types";
import type { CourseCategory } from "@/hooks/useCourseCategories";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CourseCardProps {
  course: Course;
  categories?: CourseCategory[];
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onToggleFavorite: (id: string) => void;
  onIncrementEpisode: (id: string, increment: boolean) => void;
  onIncrementModule?: (id: string, increment: boolean) => void;
}

const statusConfig = {
  not_started: { label: "Não Iniciado", icon: Clock, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em Progresso", icon: Play, color: "bg-blue-500/20 text-blue-600" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "bg-green-500/20 text-green-600" },
  paused: { label: "Pausado", icon: Pause, color: "bg-amber-500/20 text-amber-600" },
};

const priorityConfig = {
  low: { label: "Baixa", color: "bg-slate-500/20 text-slate-600" },
  medium: { label: "Média", color: "bg-yellow-500/20 text-yellow-700" },
  high: { label: "Alta", color: "bg-red-500/20 text-red-600" },
};

const categoryIcons: Record<string, string> = {
  programacao: "💻",
  design: "🎨",
  marketing: "📈",
  negocios: "💼",
  idiomas: "🌍",
  desenvolvimento_pessoal: "🧠",
  financas: "💰",
  saude: "🏃",
  musica: "🎵",
  fotografia: "📷",
  default: "📚",
};

export function CourseCard({ 
  course, 
  categories = [],
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onIncrementEpisode,
  onIncrementModule
}: CourseCardProps) {
  // Progresso baseado em módulos e episódios
  const totalModules = course.total_modules || 1;
  const currentModule = course.current_module || 0;
  const totalEpisodes = course.total_episodes || 1;
  const currentEpisode = course.current_episode || 0;
  
  // Progresso geral: considera módulos completos + fração do módulo atual
  const moduleProgress = totalModules > 0 ? (currentModule / totalModules) * 100 : 0;
  const episodeProgress = totalEpisodes > 0 ? (currentEpisode / totalEpisodes) * 100 : 0;
  // Média ponderada: 70% módulos, 30% episódios (ou só episódios se só tiver 1 módulo)
  const progress = totalModules > 1 
    ? (moduleProgress * 0.7 + episodeProgress * 0.3) 
    : episodeProgress;
  
  const status = statusConfig[course.status] || statusConfig.not_started;
  const priority = priorityConfig[course.priority] || priorityConfig.medium;
  const categoryIcon = categoryIcons[course.category || ""] || categoryIcons.default;
  const StatusIcon = status.icon;
  
  // Buscar cor da categoria
  const categoryData = categories.find(cat => cat.name === course.category);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0">{categoryIcon}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate leading-tight">
                {course.name}
              </h3>
              {course.platform && (
                <p className="text-xs text-muted-foreground truncate">
                  {course.platform}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => onToggleFavorite(course.id)}
          >
            {course.is_favorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="secondary" className={`text-xs ${status.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          <Badge variant="secondary" className={`text-xs ${priority.color}`}>
            {priority.label}
          </Badge>
          {/* Badge de categoria com cor do banco */}
          {course.category && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={categoryData ? { 
                backgroundColor: `${categoryData.color}20`,
                color: categoryData.color 
              } : undefined}
            >
              {course.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Progresso de Módulos (se houver mais de 1) */}
        {totalModules > 1 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentModule <= 0}
                  onClick={() => onIncrementModule?.(course.id, false)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="min-w-[90px] text-center font-medium">
                  Módulo {currentModule}/{totalModules}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentModule >= totalModules}
                  onClick={() => onIncrementModule?.(course.id, true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Progresso de Episódios/Aulas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentEpisode <= 0}
                onClick={() => onIncrementEpisode(course.id, false)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-[80px] text-center">
                Ep. {currentEpisode}/{totalEpisodes}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentEpisode >= totalEpisodes}
                onClick={() => onIncrementEpisode(course.id, true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <span className="font-medium text-xs">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Meta-info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            R$ {(course.price || 0).toFixed(2)}
          </span>
          {course.started_at && (
            <span>
              Início: {format(new Date(course.started_at), "dd/MM/yy", { locale: ptBR })}
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          {course.url && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-8 text-xs"
              onClick={() => window.open(course.url!, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => onEdit(course)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(course)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
