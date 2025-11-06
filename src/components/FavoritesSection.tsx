import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="px-6 py-4 border-t bg-muted/30">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-background/50">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-lg font-semibold">
                  Favoritos de Outros Projetos ({favoriteTasks.length})
                </h2>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4 space-y-6">
            {Object.values(tasksByCategory).map(({ category, tasks }) => (
              <div key={category.id} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground px-2">
                  📁 {category.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {tasks.map((task: any) => {
                    const currentColumnIndex = columns.findIndex(c => c.id === task.column_id);
                    return (
                      <TaskCard
                        key={task.id}
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
                        compact
                        showCategoryBadge
                        onToggleFavorite={toggleFavorite}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </CollapsibleContent>
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
