import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Task } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";
import { useProductivityInsightsEdgeFunctions } from "@/hooks/useEdgeFunctions";
import type { UserStats } from "@/hooks/useUserStats";

interface ProductivityInsightsProps {
  stats: UserStats | null | undefined;
  tasks: Task[];
}
interface Pattern {
  icon: string;
  title: string;
  description: string;
  type: "positive" | "warning" | "negative";
}
interface Suggestion {
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}
interface InsightsData {
  overallScore: number;
  scoreLabel: string;
  mainInsight: string;
  patterns: Pattern[];
  suggestions: Suggestion[];
  weeklyComparison: {
    current: number;
    previous: number;
    trend: "up" | "down" | "stable";
  };
}

export function ProductivityInsights({ stats, tasks }: ProductivityInsightsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const { toast } = useToast();
  const { analyzeProductivity: invokeAnalyze } = useProductivityInsightsEdgeFunctions();

  const analyzeProductivity = async () => {
    if (!stats) {
      toast({
        title: "Dados insuficientes",
        description: "Aguarde o carregamento das estatísticas.",
        variant: "destructive",
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await invokeAnalyze(stats, tasks);

      if (error) {
        if (error.message?.includes("Rate limit")) {
          toast({
            title: "⏱️ Limite de requisições",
            description: "Aguarde alguns minutos antes de tentar novamente.",
            variant: "destructive",
          });
        } else if (error.message?.includes("Créditos insuficientes")) {
          toast({
            title: "💳 Créditos insuficientes",
            description: "Adicione créditos para continuar usando a IA.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      setInsights(data);
      toast({
        title: "✨ Análise concluída",
        description: "Seus insights de produtividade foram gerados!",
      });
    } catch {
      toast({
        title: "Erro na análise",
        description: "Não foi possível gerar os insights. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="items-center justify-between flex flex-col py-0">
          <div>
            <CardTitle className="flex items-center gap-2 py-[10px]">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights de Produtividade com IA
            </CardTitle>
            <CardDescription className="py-[10px]">
              Análise inteligente dos seus padrões de trabalho e sugestões personalizadas
            </CardDescription>
          </div>
          <Button onClick={analyzeProductivity} disabled={isAnalyzing || !stats} size="sm" className="text-left">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {insights && (
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <h3 className="text-lg font-semibold">{insights.scoreLabel}</h3>
              <p className="text-sm text-muted-foreground">{insights.mainInsight}</p>
            </div>
            <div className="text-4xl font-bold text-primary">
              {insights.overallScore}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Tarefas esta semana</p>
              <p className="text-2xl font-bold">{insights.weeklyComparison.current}</p>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(insights.weeklyComparison.trend)}
              <span className="text-sm font-medium">
                {insights.weeklyComparison.trend === "up" && "Aumentou"}
                {insights.weeklyComparison.trend === "down" && "Diminuiu"}
                {insights.weeklyComparison.trend === "stable" && "Estável"}
              </span>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground">Semana anterior</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {insights.weeklyComparison.previous}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">📊 Padrões Identificados</h3>
            <div className="grid gap-3">
              {insights.patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <span className="text-2xl">{pattern.icon}</span>
                  <div className="flex-1">
                    <h4 className={`font-medium ${getTypeColor(pattern.type)}`}>{pattern.title}</h4>
                    <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">💡 Sugestões de Melhoria</h3>
            <div className="grid gap-3">
              {insights.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <span className="text-2xl">{suggestion.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <Badge variant={getPriorityVariant(suggestion.priority)} className="text-xs">
                        {suggestion.priority === "high" && "Alta"}
                        {suggestion.priority === "medium" && "Média"}
                        {suggestion.priority === "low" && "Baixa"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
