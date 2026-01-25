import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Shield, Database, AlertTriangle, Clock, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/data/useSettings";
import { logger } from "@/lib/logger";

interface IntegrityIssue {
  type: 'missing_recurrence_tag' | 'orphan_recurrence_tag' | 'invalid_recurrence_rule' | 'duplicate';
  severity: 'low' | 'medium' | 'high';
  taskId: string;
  taskTitle: string;
  details: string;
  fixable: boolean;
}

interface IntegrityReport {
  timestamp: Date;
  totalTasks: number;
  tasksWithRecurrence: number;
  tasksWithRecurrenceTag: number;
  issues: IntegrityIssue[];
  healthy: boolean;
}

export function DataIntegrityMonitor() {
  const [loading, setLoading] = useState(false);
  const { settings, updateSettings, saveSettings } = useSettings();
  const autoMonitor = settings.interface.autoDataIntegrityMonitor;
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [fixing, setFixing] = useState(false);

  const handleAutoMonitorChange = async (value: boolean) => {
    updateSettings({ interface: { ...settings.interface, autoDataIntegrityMonitor: value } });
    await saveSettings();
  };

  const runIntegrityCheck = useCallback(async () => {
    setLoading(true);
    const issues: IntegrityIssue[] = [];

    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, recurrence_rule, category_id, is_completed, tags');

      if (error) throw error;

      const tasksWithRecurrence = tasks?.filter(t => t.recurrence_rule !== null) || [];
      const tasksWithRecurrenceTag = tasks?.filter(t => 
        t.tags?.some((tag: string) => tag.toLowerCase() === 'recorrente')
      ) || [];

      // Verificar tarefas com recurrence_rule mas SEM tag "recorrente"
      for (const task of tasksWithRecurrence) {
        const hasRecurrenceTag = task.tags?.some((tag: string) => tag.toLowerCase() === 'recorrente');
        if (!hasRecurrenceTag) {
          issues.push({
            type: 'missing_recurrence_tag',
            severity: 'medium',
            taskId: task.id,
            taskTitle: task.title,
            details: 'Tarefa tem regra de recorrência mas não possui a tag "recorrente"',
            fixable: true
          });
        }
      }

      // Verificar tarefas com tag "recorrente" mas SEM recurrence_rule
      for (const task of tasksWithRecurrenceTag) {
        if (!task.recurrence_rule) {
          issues.push({
            type: 'orphan_recurrence_tag',
            severity: 'low',
            taskId: task.id,
            taskTitle: task.title,
            details: 'Tarefa tem tag "recorrente" mas não possui regra de recorrência configurada',
            fixable: true
          });
        }
      }

      // Verificar recurrence_rule malformado
      for (const task of tasksWithRecurrence) {
        if (task.recurrence_rule) {
          try {
            const rule = typeof task.recurrence_rule === 'string' 
              ? JSON.parse(task.recurrence_rule) 
              : task.recurrence_rule;
            
            // Validar estrutura básica
            if (!rule.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) {
              issues.push({
                type: 'invalid_recurrence_rule',
                severity: 'high',
                taskId: task.id,
                taskTitle: task.title,
                details: `Regra de recorrência inválida: frequency ausente ou inválido`,
                fixable: false
              });
            }
          } catch {
            issues.push({
              type: 'invalid_recurrence_rule',
              severity: 'high',
              taskId: task.id,
              taskTitle: task.title,
              details: 'Regra de recorrência com formato JSON inválido',
              fixable: false
            });
          }
        }
      }

      // Verificar duplicatas (mais de 2 tarefas com mesmo título na mesma categoria)
      const titleCategoryMap = new Map<string, typeof tasks>();
      for (const task of tasks || []) {
        const key = `${task.title.toLowerCase().trim()}|${task.category_id}`;
        if (!titleCategoryMap.has(key)) {
          titleCategoryMap.set(key, []);
        }
        titleCategoryMap.get(key)!.push(task);
      }

      for (const [, duplicates] of titleCategoryMap) {
        if (duplicates.length > 2) {
          issues.push({
            type: 'duplicate',
            severity: 'low',
            taskId: duplicates[0].id,
            taskTitle: duplicates[0].title,
            details: `${duplicates.length} tarefas com título similar na mesma categoria`,
            fixable: false
          });
        }
      }

      const newReport: IntegrityReport = {
        timestamp: new Date(),
        totalTasks: tasks?.length || 0,
        tasksWithRecurrence: tasksWithRecurrence.length,
        tasksWithRecurrenceTag: tasksWithRecurrenceTag.length,
        issues,
        healthy: issues.filter(i => i.severity === 'high').length === 0
      };

      setReport(newReport);
      setLastCheck(new Date());

      const criticalIssues = issues.filter(i => i.severity === 'high');
      if (criticalIssues.length > 0) {
        toast.error(`${criticalIssues.length} problema(s) crítico(s) detectado(s)!`);
      } else if (issues.length > 0) {
        toast.warning(`${issues.length} inconsistência(s) encontrada(s)`);
      } else {
        toast.success('Integridade dos dados OK!');
      }

    } catch (err) {
      logger.error('Erro na verificação:', err);
      toast.error('Erro ao verificar integridade');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-monitor a cada 5 minutos
  useEffect(() => {
    if (autoMonitor) {
      const interval = setInterval(runIntegrityCheck, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoMonitor, runIntegrityCheck]);

  // Check inicial
  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const fixIssue = async (issue: IntegrityIssue) => {
    setFixing(true);
    try {
      if (issue.type === 'missing_recurrence_tag') {
        // Adicionar tag "recorrente" à tarefa
        const { data: task } = await supabase
          .from('tasks')
          .select('tags')
          .eq('id', issue.taskId)
          .single();

        const currentTags = task?.tags || [];
        const newTags = [...currentTags, 'recorrente'];

        const { error } = await supabase
          .from('tasks')
          .update({ tags: newTags })
          .eq('id', issue.taskId);
        
        if (error) throw error;
        toast.success('Tag "recorrente" adicionada');
      } else if (issue.type === 'orphan_recurrence_tag') {
        // Remover tag "recorrente" de tarefa sem regra
        const { data: task } = await supabase
          .from('tasks')
          .select('tags')
          .eq('id', issue.taskId)
          .single();

        const currentTags = task?.tags || [];
        const newTags = currentTags.filter((tag: string) => tag.toLowerCase() !== 'recorrente');

        const { error } = await supabase
          .from('tasks')
          .update({ tags: newTags })
          .eq('id', issue.taskId);
        
        if (error) throw error;
        toast.success('Tag "recorrente" removida');
      }
      await runIntegrityCheck();
    } catch (err) {
      logger.error('Erro ao corrigir:', err);
      toast.error('Erro ao corrigir problema');
    } finally {
      setFixing(false);
    }
  };

  const fixAllIssues = async () => {
    if (!report) return;
    setFixing(true);
    const fixableIssues = report.issues.filter(i => i.fixable);
    let fixed = 0;
    let failed = 0;

    for (const issue of fixableIssues) {
      try {
        if (issue.type === 'missing_recurrence_tag') {
          const { data: task } = await supabase
            .from('tasks')
            .select('tags')
            .eq('id', issue.taskId)
            .single();

          const currentTags = task?.tags || [];
          const newTags = [...currentTags, 'recorrente'];

          const { error } = await supabase
            .from('tasks')
            .update({ tags: newTags })
            .eq('id', issue.taskId);
          
          if (error) {
            logger.error('Erro ao corrigir missing_recurrence_tag:', issue.taskId, error);
            failed++;
          } else {
            fixed++;
          }
        } else if (issue.type === 'orphan_recurrence_tag') {
          const { data: task } = await supabase
            .from('tasks')
            .select('tags')
            .eq('id', issue.taskId)
            .single();

          const currentTags = task?.tags || [];
          const newTags = currentTags.filter((tag: string) => tag.toLowerCase() !== 'recorrente');

          const { error } = await supabase
            .from('tasks')
            .update({ tags: newTags })
            .eq('id', issue.taskId);
          
          if (error) {
            logger.error('Erro ao corrigir orphan_recurrence_tag:', issue.taskId, error);
            failed++;
          } else {
            fixed++;
          }
        }
      } catch (err) {
        logger.error('Erro ao corrigir:', issue, err);
        failed++;
      }
    }

    if (failed > 0) {
      toast.warning(`${fixed} corrigido(s), ${failed} falhou(aram)`);
    } else {
      toast.success(`${fixed}/${fixableIssues.length} problemas corrigidos`);
    }
    
    await runIntegrityCheck();
    setFixing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'missing_recurrence_tag': return 'Tag Faltando';
      case 'orphan_recurrence_tag': return 'Tag Órfã';
      case 'invalid_recurrence_rule': return 'Regra Inválida';
      case 'duplicate': return 'Possível Duplicata';
      default: return type;
    }
  };

  const healthScore = report 
    ? Math.max(0, 100 - (report.issues.filter(i => i.severity === 'high').length * 30) - (report.issues.filter(i => i.severity === 'medium').length * 10) - (report.issues.filter(i => i.severity === 'low').length * 2))
    : 100;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Monitoramento de Integridade
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch 
                  id="auto-monitor" 
                  checked={autoMonitor} 
                  onCheckedChange={handleAutoMonitorChange} 
                />
                <Label htmlFor="auto-monitor" className="text-sm">Auto (5min)</Label>
              </div>
              <Button size="sm" variant="outline" onClick={runIntegrityCheck} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Saúde dos Dados</span>
                <span className="text-sm font-bold">{healthScore}%</span>
              </div>
              <Progress 
                value={healthScore} 
                className={healthScore < 50 ? '[&>div]:bg-destructive' : healthScore < 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}
              />
            </div>
            {report?.healthy ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          {lastCheck && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Database className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{report?.totalTasks || 0}</div>
            <div className="text-xs text-muted-foreground">Total de Tarefas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Repeat className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold">{report?.tasksWithRecurrence || 0}</div>
            <div className="text-xs text-muted-foreground">Com Regra</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <RefreshCw className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold">{report?.tasksWithRecurrenceTag || 0}</div>
            <div className="text-xs text-muted-foreground">Com Tag</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{report?.issues.length || 0}</div>
            <div className="text-xs text-muted-foreground">Problemas</div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Problemas Detectados</CardTitle>
              <CardDescription>
                {report?.issues.length === 0 ? 'Nenhum problema encontrado' : `${report?.issues.length} inconsistência(s)`}
              </CardDescription>
            </div>
            {report && report.issues.filter(i => i.fixable).length > 0 && (
              <Button onClick={fixAllIssues} disabled={fixing} size="sm">
                {fixing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Corrigir Todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {report?.issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>Todos os dados estão íntegros!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {report?.issues.map((issue, idx) => (
                <div key={`${issue.taskId}-${idx}`} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getSeverityColor(issue.severity) as any}>
                        {issue.severity === 'high' ? 'Crítico' : issue.severity === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                      <Badge variant="outline">{getTypeLabel(issue.type)}</Badge>
                    </div>
                    <p className="font-medium text-sm truncate">{issue.taskTitle}</p>
                    <p className="text-xs text-muted-foreground">{issue.details}</p>
                  </div>
                  {issue.fixable && (
                    <Button size="sm" variant="outline" onClick={() => fixIssue(issue)} disabled={fixing} className="ml-2 shrink-0">
                      Corrigir
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
