import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DataCleanup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    fixed: number;
    errors: string[];
  } | null>(null);

  const fixMirrorReferences = async () => {
    setLoading(true);
    setResults(null);

    try {
      // Lista de correções a fazer (baseado na auditoria)
      const fixes = [
        { mirrorId: '985e52b0-ff83-4607-842f-02f889673c8a', originalId: '4253cdde-1a94-4fc5-95df-753d14e8882a', title: 'MDAccula - E-mail' },
        { mirrorId: '0572a792-0b2c-47e6-aff3-18bbbfe3ad61', originalId: 'd489fc22-1ba6-4c1b-9bef-0275cf75477f', title: 'Mae - Leeds 50/dia' },
        { mirrorId: '8ea3447a-e57e-436f-b86a-ad4494e92618', originalId: '3babcf1a-6145-4794-a5e0-af6d4099785b', title: 'P - Cardio' },
        { mirrorId: '9a2983a7-f7e7-40dc-bb90-6d93cb8555b0', originalId: '0c7ef9fe-ae12-4a24-8505-aa21364bbe2d', title: 'P - Treino' },
        { mirrorId: '9ee780ac-e3c1-4cb0-8803-6edd006196ff', originalId: '624964a6-a5b4-4a05-a9cf-62dfc7f73e6f', title: 'P - Organizar Casa' },
      ];

      let fixed = 0;
      const errors: string[] = [];

      for (const fix of fixes) {
        try {
          // Atualizar o espelho para apontar de volta para a tarefa original
          const { error } = await supabase
            .from('tasks')
            .update({ mirror_task_id: fix.originalId })
            .eq('id', fix.mirrorId);

          if (error) {
            errors.push(`${fix.title}: ${error.message}`);
          } else {
            fixed++;
          }
        } catch (err) {
          errors.push(`${fix.title}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      setResults({
        total: fixes.length,
        fixed,
        errors
      });

      if (fixed > 0) {
        toast.success(`${fixed}/${fixes.length} referências corrigidas!`);
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} erros encontrados`);
      }
    } catch (err) {
      toast.error('Erro ao processar limpeza');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🔧 Limpeza de Dados</h1>
          <p className="text-muted-foreground">
            Ferramenta para corrigir referências mútuas quebradas entre tarefas espelhadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Corrigir Referências de Espelhos</CardTitle>
            <CardDescription>
              Identifica e corrige tarefas em categorias de Projetos que têm espelhos no Diário,
              mas os espelhos não apontam de volta para as tarefas originais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Problemas Identificados:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>MDAccula - E-mail: espelho sem referência mútua</li>
                <li>Mae - Leeds 50/dia: espelho sem referência mútua</li>
                <li>P - Cardio: espelho sem referência mútua</li>
                <li>P - Treino: espelho sem referência mútua</li>
                <li>P - Organizar Casa: espelho sem referência mútua</li>
              </ul>
            </div>

            <Button 
              onClick={fixMirrorReferences}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Corrigir Referências'
              )}
            </Button>

            {results && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {results.fixed === results.total ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-semibold">
                    {results.fixed} de {results.total} referências corrigidas
                  </span>
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-destructive">Erros:</h4>
                    <div className="space-y-1">
                      {results.errors.map((error, i) => (
                        <div key={i} className="text-sm bg-destructive/10 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.fixed > 0 && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✅ As referências foram corrigidas! As tarefas agora têm sincronização bidirecional funcionando.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total de tarefas no banco</span>
              <Badge variant="secondary">64</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tarefas com recurrence_rule</span>
              <Badge variant="secondary">13</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tarefas com espelhos ativos</span>
              <Badge variant="secondary">5</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Duplicatas detectadas</span>
              <Badge variant="default">0 ✅</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Referências quebradas</span>
              <Badge variant="destructive">5 ❌</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Voltar ao Kanban
          </Button>
        </div>
      </div>
    </div>
  );
}
