import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Task } from "@/hooks/tasks/useTasks";
import { useRateLimiter, RATE_LIMIT_CONFIGS } from "@/hooks/useRateLimiter";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AIOrganizationResult {
  reorderedTasks: Array<{ id: string; newPosition: number; reason: string }>;
  insights: string[];
  summary: string;
}

interface DailySortControlsProps {
  sortOption: "time" | "name" | "priority";
  onSortChange: (value: "time" | "name" | "priority") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  onDensityChange?: (value: "comfortable" | "compact" | "ultra-compact") => void;
  tasks?: Task[];
  onReorderTasks?: (reorderedTasks: Array<{ id: string; position: number }>) => void;
}

export function DailySortControls({ 
  sortOption, 
  onSortChange, 
  sortOrder, 
  onSortOrderChange,
  densityMode = "comfortable",
  onDensityChange,
  tasks = [],
  onReorderTasks
}: DailySortControlsProps) {
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [aiResult, setAiResult] = useState<AIOrganizationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Rate limiter para endpoint de IA
  const { checkLimit: checkAILimit } = useRateLimiter(RATE_LIMIT_CONFIGS.ai);

  const organizeWithAI = async () => {
    // Verificar rate limit antes de fazer requisição
    if (!checkAILimit()) return;
    
    if (!tasks || tasks.length === 0) {
      toast.error("Não há tarefas para organizar");
      return;
    }

    if (!onReorderTasks) {
      toast.error("Função de reordenação não disponível");
      return;
    }

    setIsOrganizing(true);

    try {
      const { data, error } = await supabase.functions.invoke("daily-assistant", {
        body: { tasks },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Muitas requisições. Aguarde um momento.");
        } else if (error.message?.includes("402")) {
          toast.error("Créditos insuficientes. Adicione em Settings → Workspace → Usage.");
        } else {
          toast.error("Erro ao organizar tarefas");
        }
        logger.error("Organize error:", error);
        return;
      }

      if (data) {
        setAiResult(data);
        setShowPreview(true);
      }
    } catch (error) {
      logger.error("Organize error:", error);
      toast.error("Erro ao organizar tarefas");
    } finally {
      setIsOrganizing(false);
    }
  };

  const applyOrganization = () => {
    if (!aiResult || !onReorderTasks) return;

    const reorderedTasks = aiResult.reorderedTasks.map(t => ({
      id: t.id,
      position: t.newPosition
    }));

    onReorderTasks(reorderedTasks);
    toast.success(aiResult.summary);
    setShowPreview(false);
    setAiResult(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-nowrap">
      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-[96px] md:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="time">Horário</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="priority">Prioridade</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={onSortOrderChange}>
        <SelectTrigger className="w-[84px] md:w-[140px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Crescente</SelectItem>
          <SelectItem value="desc">Decrescente</SelectItem>
        </SelectContent>
      </Select>

      {onDensityChange && (
        <Select value={densityMode} onValueChange={onDensityChange}>
          <SelectTrigger className="w-[96px] md:w-[160px]">
            <Maximize2 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">Confortável</SelectItem>
            <SelectItem value="compact">Compacto</SelectItem>
            <SelectItem value="ultra-compact">Ultra</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* AI Organization Button */}
      {tasks && tasks.length > 0 && onReorderTasks && (
        <Button
          variant="default"
          size="sm"
          onClick={organizeWithAI}
          disabled={isOrganizing}
          className="gap-2"
          title="Organizar tarefas com IA"
        >
          <Sparkles className={`h-4 w-4 ${isOrganizing ? "animate-pulse" : ""}`} />
          <span className="hidden md:inline">Organizar com IA</span>
        </Button>
      )}
    </div>

      {/* AI Organization Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestão de Organização IA
            </DialogTitle>
            <DialogDescription>
              {aiResult?.summary}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Insights */}
            {aiResult?.insights && aiResult.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">💡 Insights</h4>
                <ul className="space-y-1">
                  {aiResult.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reordered Tasks Preview */}
            {aiResult?.reorderedTasks && aiResult.reorderedTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">📋 Nova Ordem</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiResult.reorderedTasks.map((task, idx) => {
                    const originalTask = tasks.find(t => t.id === task.id);
                    return (
                      <div key={task.id} className="p-2 border rounded-md text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-muted-foreground">#{idx + 1}</span>
                          <div className="flex-1">
                            <p className="font-medium">{originalTask?.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{task.reason}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancelar
            </Button>
            <Button onClick={applyOrganization}>
              Aplicar Organização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
