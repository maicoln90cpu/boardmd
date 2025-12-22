import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileJson, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  FolderOpen, 
  ListTodo,
  AlertTriangle,
  Upload
} from "lucide-react";
import { ValidationResult, MergeResult, ImportCategory, ImportTask } from "@/lib/importValidation";
import { cn } from "@/lib/utils";

interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult | null;
  mergeResult: MergeResult | null;
  fileName: string;
  onConfirmImport: (options: ImportOptions) => void;
  isImporting: boolean;
}

export interface ImportOptions {
  importCategories: boolean;
  importTasks: boolean;
  selectedCategories: string[];
  selectedTasks: string[];
}

export function ImportPreviewModal({
  open,
  onOpenChange,
  validationResult,
  mergeResult,
  fileName,
  onConfirmImport,
  isImporting
}: ImportPreviewModalProps) {
  const [importCategories, setImportCategories] = useState(true);
  const [importTasks, setImportTasks] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("summary");

  // Inicializar seleções quando o modal abrir
  useMemo(() => {
    if (mergeResult) {
      setSelectedCategories(new Set(mergeResult.categoriesToAdd.map(c => c.name)));
      setSelectedTasks(new Set(mergeResult.tasksToAdd.map(t => t.title)));
    }
  }, [mergeResult]);

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const toggleTask = (title: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const selectAllCategories = () => {
    if (mergeResult) {
      setSelectedCategories(new Set(mergeResult.categoriesToAdd.map(c => c.name)));
    }
  };

  const deselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const selectAllTasks = () => {
    if (mergeResult) {
      setSelectedTasks(new Set(mergeResult.tasksToAdd.map(t => t.title)));
    }
  };

  const deselectAllTasks = () => {
    setSelectedTasks(new Set());
  };

  const handleConfirm = () => {
    onConfirmImport({
      importCategories,
      importTasks,
      selectedCategories: Array.from(selectedCategories),
      selectedTasks: Array.from(selectedTasks)
    });
  };

  const canImport = validationResult?.isValid && 
    ((importCategories && selectedCategories.size > 0) || (importTasks && selectedTasks.size > 0));

  if (!validationResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Preview da Importação
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Arquivo:</span>
          <Badge variant="outline">{fileName}</Badge>
        </div>

        {/* Status da Validação */}
        {validationResult.isValid ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Arquivo válido! Pronto para importação.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Arquivo inválido. Corrija os erros antes de importar.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="categories" disabled={!mergeResult?.categoriesToAdd.length}>
              Categorias ({mergeResult?.categoriesToAdd.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tasks" disabled={!mergeResult?.tasksToAdd.length}>
              Tarefas ({mergeResult?.tasksToAdd.length || 0})
            </TabsTrigger>
            <TabsTrigger value="warnings" disabled={!validationResult.warnings.length && !validationResult.errors.length}>
              Avisos ({validationResult.warnings.length + validationResult.errors.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="summary" className="mt-0 space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <FolderOpen className="h-4 w-4" />
                    Categorias
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Total no arquivo:</span>
                      <span>{validationResult.stats.totalCategories}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Novas (serão adicionadas):</span>
                      <span>{validationResult.stats.newCategories}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duplicadas (ignoradas):</span>
                      <span>{validationResult.stats.duplicateCategories}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ListTodo className="h-4 w-4" />
                    Tarefas
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Total no arquivo:</span>
                      <span>{validationResult.stats.totalTasks}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Novas (serão adicionadas):</span>
                      <span>{validationResult.stats.newTasks}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duplicadas (ignoradas):</span>
                      <span>{validationResult.stats.duplicateTasks}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opções de importação */}
              <div className="space-y-3 p-4 rounded-lg border">
                <h4 className="font-medium">O que deseja importar?</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={importCategories} 
                      onCheckedChange={(checked) => setImportCategories(!!checked)}
                      disabled={!mergeResult?.categoriesToAdd.length}
                    />
                    <span>Categorias ({mergeResult?.categoriesToAdd.length || 0} novas)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={importTasks} 
                      onCheckedChange={(checked) => setImportTasks(!!checked)}
                      disabled={!mergeResult?.tasksToAdd.length}
                    />
                    <span>Tarefas ({mergeResult?.tasksToAdd.length || 0} novas)</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-0 space-y-3">
              {mergeResult && mergeResult.categoriesToAdd.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Selecione as categorias para importar:
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllCategories}>
                        Selecionar todas
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllCategories}>
                        Desmarcar todas
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {mergeResult.categoriesToAdd.map((cat, idx) => (
                      <label 
                        key={idx} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedCategories.has(cat.name) 
                            ? "bg-primary/5 border-primary/30" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox 
                          checked={selectedCategories.has(cat.name)}
                          onCheckedChange={() => toggleCategory(cat.name)}
                        />
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {mergeResult && mergeResult.skippedCategories.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30">
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">
                    Categorias ignoradas (já existem):
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {mergeResult.skippedCategories.map((name, idx) => (
                      <Badge key={idx} variant="secondary">{name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 space-y-3">
              {mergeResult && mergeResult.tasksToAdd.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Selecione as tarefas para importar:
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllTasks}>
                        Selecionar todas
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllTasks}>
                        Desmarcar todas
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {mergeResult.tasksToAdd.map((task, idx) => (
                      <label 
                        key={idx} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedTasks.has(task.title) 
                            ? "bg-primary/5 border-primary/30" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox 
                          checked={selectedTasks.has(task.title)}
                          onCheckedChange={() => toggleTask(task.title)}
                        />
                        <ListTodo className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{task.title}</span>
                          {task.description && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {task.description}
                            </span>
                          )}
                        </div>
                        {task.priority && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              task.priority === 'high' && "border-red-500 text-red-500",
                              task.priority === 'medium' && "border-yellow-500 text-yellow-500",
                              task.priority === 'low' && "border-green-500 text-green-500"
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {mergeResult && mergeResult.skippedTasks.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30">
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">
                    Tarefas ignoradas (já existem):
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {mergeResult.skippedTasks.slice(0, 10).map((title, idx) => (
                      <Badge key={idx} variant="secondary" className="truncate max-w-[200px]">
                        {title}
                      </Badge>
                    ))}
                    {mergeResult.skippedTasks.length > 10 && (
                      <Badge variant="secondary">
                        +{mergeResult.skippedTasks.length - 10} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="warnings" className="mt-0 space-y-3">
              {validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Erros ({validationResult.errors.length})
                  </h4>
                  {validationResult.errors.map((error, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Avisos ({validationResult.warnings.length})
                  </h4>
                  {validationResult.warnings.map((warning, idx) => (
                    <Alert key={idx} className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!canImport || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar Selecionados
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
