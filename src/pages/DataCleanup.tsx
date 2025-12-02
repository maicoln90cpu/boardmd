import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Shield, Database, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface IntegrityIssue {
  type: 'broken_reference' | 'duplicate' | 'orphan_mirror' | 'missing_mutual';
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
  tasksWithMirrors: number;
  issues: IntegrityIssue[];
  healthy: boolean;
}

export default function DataCleanup() {
  const [loading, setLoading] = useState(false);
  const [autoMonitor, setAutoMonitor] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [fixing, setFixing] = useState(false);

  const runIntegrityCheck = useCallback(async () => {
    setLoading(true);
    const issues: IntegrityIssue[] = [];

    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, mirror_task_id, recurrence_rule, category_id, is_completed');

      if (error) throw error;

      const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
      const tasksWithRecurrence = tasks?.filter(t => t.recurrence_rule !== null) || [];
      const tasksWithMirrors = tasks?.filter(t => t.mirror_task_id !== null) || [];

      // Verificar referências quebradas
      for (const task of tasksWithMirrors) {
        if (task.mirror_task_id && !taskMap.has(task.mirror_task_id)) {
          issues.push({
            type: 'broken_reference',
            severity: 'high',
            taskId: task.id,
            taskTitle: task.title,
            details: `Referência para tarefa inexistente: ${task.mirror_task_id}`,
            fixable: true
          });
        }
      }

      // Verificar referências mútuas quebradas
      for (const task of tasksWithMirrors) {
        if (task.mirror_task_id) {
          const mirrorTask = taskMap.get(task.mirror_task_id);
          if (mirrorTask && mirrorTask.mirror_task_id !== task.id) {
            issues.push({
              type: 'missing_mutual',
              severity: 'medium',
              taskId: task.id,
              taskTitle: task.title,
              details: `Espelho "${mirrorTask.title}" não aponta de volta`,
              fixable: true
            });
          }
        }
      }

      // Verificar duplicatas
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

      // Verificar tarefas recorrentes órfãs
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');
      
      const diarioCategory = categories?.find(c => c.name.toLowerCase() === 'diário');
      
      for (const task of tasksWithRecurrence) {
        if (diarioCategory && task.category_id !== diarioCategory.id && !task.mirror_task_id) {
          const hasMirror = tasks?.some(t => t.mirror_task_id === task.id);
          if (!hasMirror) {
            issues.push({
              type: 'orphan_mirror',
              severity: 'low',
              taskId: task.id,
              taskTitle: task.title,
              details: 'Tarefa recorrente sem espelho no Diário',
              fixable: false
            });
          }
        }
      }

      const newReport: IntegrityReport = {
        timestamp: new Date(),
        totalTasks: tasks?.length || 0,
        tasksWithRecurrence: tasksWithRecurrence.length,
        tasksWithMirrors: tasksWithMirrors.length,
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
      console.error('Erro na verificação:', err);
      toast.error('Erro ao verificar integridade');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoMonitor) {
      const interval = setInterval(runIntegrityCheck, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoMonitor, runIntegrityCheck]);

  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const fixIssue = async (issue: IntegrityIssue) => {
    setFixing(true);
    try {
      if (issue.type === 'broken_reference') {
        await supabase.from('tasks').update({ mirror_task_id: null }).eq('id', issue.taskId);
        toast.success('Referência quebrada removida');
      } else if (issue.type === 'missing_mutual') {
        const { data: task } = await supabase
          .from('tasks')
          .select('mirror_task_id')
          .eq('id', issue.taskId)
          .single();
        
        if (task?.mirror_task_id) {
          await supabase.from('tasks').update({ mirror_task_id: issue.taskId }).eq('id', task.mirror_task_id);
          toast.success('Referência mútua restaurada');
        }
      }
      await runIntegrityCheck();
    } catch (err) {
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

    for (const issue of fixableIssues) {
      try {
        if (issue.type === 'broken_reference') {
          await supabase.from('tasks').update({ mirror_task_id: null }).eq('id', issue.taskId);
          fixed++;
        } else if (issue.type === 'missing_mutual') {
          const { data: task } = await supabase
            .from('tasks')
            .select('mirror_task_id')
            .eq('id', issue.taskId)
            .single();
          if (task?.mirror_task_id) {
            await supabase.from('tasks').update({ mirror_task_id: issue.taskId }).eq('id', task.mirror_task_id);
            fixed++;
          }
        }
      } catch (err) {
        console.error('Erro ao corrigir:', issue, err);
      }
    }

    toast.success(`${fixed}/${fixableIssues.length} problemas corrigidos`);
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
      case 'broken_reference': return 'Referência Quebrada';
      case 'duplicate': return 'Possível Duplicata';
      case 'orphan_mirror': return 'Espelho Órfão';
      case 'missing_mutual': return 'Ref. Mútua Faltando';
      default: return type;
    }
  };

  const healthScore = report 
    ? Math.max(0, 100 - (report.issues.filter(i => i.severity === 'high').length * 30) - (report.issues.filter(i => i.severity === 'medium').length * 10) - (report.issues.filter(i => i.severity === 'low').length * 2))
    : 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7" />
              Monitoramento de Integridade
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Verificação automática de inconsistências
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status Geral</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="auto-monitor" checked={autoMonitor} onCheckedChange={setAutoMonitor} />
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
              <RefreshCw className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{report?.tasksWithRecurrence || 0}</div>
              <div className="text-xs text-muted-foreground">Recorrentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{report?.tasksWithMirrors || 0}</div>
              <div className="text-xs text-muted-foreground">Com Espelhos</div>
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
              <div className="space-y-3">
                {report?.issues.map((issue, idx) => (
                  <div key={`${issue.taskId}-${idx}`} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(issue.severity) as any}>
                          {issue.severity === 'high' ? 'Crítico' : issue.severity === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(issue.type)}</Badge>
                      </div>
                      <p className="font-medium text-sm">{issue.taskTitle}</p>
                      <p className="text-xs text-muted-foreground">{issue.details}</p>
                    </div>
                    {issue.fixable && (
                      <Button size="sm" variant="outline" onClick={() => fixIssue(issue)} disabled={fixing}>
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
    </div>
  );
}
