import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Star, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FavoritesSectionProps {
  columns: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export function FavoritesSection({ columns, categories }: FavoritesSectionProps) {
  const { tasks, updateTask, deleteTask, toggleFavorite } = useTasks("all");
  const [isOpen, setIsOpen] = useState(true);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtrar apenas favoritos de categorias não-Diário
  const dailyCategory = categories.find(c => c.name === "Diário");
  const favoriteTasks = tasks.filter(
    t => t.is_favorite && t.category_id !== dailyCategory?.id
  );

  if (!categories || categories.length === 0) {
    return null;
  }

  // Agrupar por categoria
  const tasksByCategory = favoriteTasks.reduce((acc, task) => {
    const category = categories.find(c => c.id === task.category_id);
    if (!category) return acc;
    
    if (!acc[category.id]) {
      acc[category.id] = {
        category,
        tasks: []
      };
    }
    acc[category.id].tasks.push(task);
    return acc;
  }, {} as Record<string, { category: any; tasks: any[] }>);

  if (favoriteTasks.length === 0) return null;

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    }
    setEditingTask(null);
    setModalOpen(false);
  };

  return (
    <>
      <div className="mx-4 my-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Header com gradiente e sombra */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-yellow-500/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
            
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-4 hover:bg-yellow-500/5 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md">
                    <Star className="h-5 w-5 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-yellow-400 dark:to-amber-400 bg-clip-text text-transparent">
                      Favoritos de Outros Projetos
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {favoriteTasks.length} {favoriteTasks.length === 1 ? 'tarefa' : 'tarefas'} favorita{favoriteTasks.length !== 1 && 's'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                    {favoriteTasks.length}
                  </Badge>
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {Object.values(tasksByCategory).map(({ category, tasks: categoryTasks }) => (
                  <div key={category.id} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 px-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {category.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {categoryTasks.length}
                      </Badge>
                    </div>
                    
                    {/* Task Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {categoryTasks.map((task: any) => {
                        const currentColumnIndex = columns.findIndex(c => c.id === task.column_id);
                        return (
                          <div 
                            key={task.id} 
                            className={cn(
                              "relative group rounded-lg overflow-hidden",
                              "bg-gradient-to-br from-background to-muted/30",
                              "border border-border/50 hover:border-yellow-500/40",
                              "shadow-sm hover:shadow-md transition-all duration-200",
                              "hover:scale-[1.02]"
                            )}
                          >
                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-amber-500/0 group-hover:from-yellow-500/5 group-hover:to-amber-500/5 transition-all duration-300 pointer-events-none" />
                            
                            {/* Left accent border */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Quick unfavorite button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "absolute top-2 right-2 z-10",
                                "h-7 w-7 rounded-full",
                                "bg-yellow-500/10 hover:bg-yellow-500/20",
                                "text-yellow-600 dark:text-yellow-400",
                                "opacity-70 group-hover:opacity-100 transition-opacity"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(task.id);
                              }}
                              title="Remover dos favoritos"
                            >
                              <Star className="h-4 w-4 fill-current" />
                            </Button>
                            
                            {/* Task Card Content */}
                            <div className="pl-3">
                              <TaskCard
                                task={task}
                                onEdit={handleEditTask}
                                onDelete={deleteTask}
                                onMoveLeft={
                                  currentColumnIndex > 0
                                    ? () => updateTask(task.id, { column_id: columns[currentColumnIndex - 1].id })
                                    : undefined
                                }
                                onMoveRight={
                                  currentColumnIndex < columns.length - 1
                                    ? () => updateTask(task.id, { column_id: columns[currentColumnIndex + 1].id })
                                    : undefined
                                }
                                canMoveLeft={currentColumnIndex > 0}
                                canMoveRight={currentColumnIndex < columns.length - 1}
                                densityMode="compact"
                                showCategoryBadge={false}
                                onToggleFavorite={undefined} // Hide internal favorite button
                                hideBadges={false}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Modal de Edição */}
      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveTask}
        task={editingTask}
        columnId={editingTask?.column_id || columns[0]?.id}
        viewMode="all"
      />
    </>
  );
}
