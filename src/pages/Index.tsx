import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { SearchFilters } from "@/components/SearchFilters";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTasks } from "@/hooks/useTasks";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

function Index() {
  const { categories, loading: loadingCategories, addCategory } = useCategories();
  const { columns, loading: loadingColumns } = useColumns();
  const { toggleTheme } = useTheme();
  const { toast } = useToast();
  const { addActivity } = useActivityLog();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dailyCategory, setDailyCategory] = useState<string>("");
  const [dailyBoardKey, setDailyBoardKey] = useState(0);
  const [viewMode, setViewMode] = useState<"category" | "all">("category");
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortOption, setSortOption] = useState("manual");
  
  const { tasks } = useTasks(viewMode === "all" ? "all" : selectedCategory);
  const { resetAllTasksToFirstColumn: resetDailyTasks } = useTasks(dailyCategory);

  useEffect(() => {
    if (categories.length > 0) {
      // Encontrar categoria "Diário"
      const daily = categories.find(c => c.name === "Diário");
      if (daily) {
        setDailyCategory(daily.id);
      }
      
      // Selecionar primeira categoria que não seja "Diário"
      if (!selectedCategory) {
        const firstNonDaily = categories.find(c => c.name !== "Diário");
        if (firstNonDaily) {
          setSelectedCategory(firstNonDaily.id);
        }
      }
    }
  }, [categories, selectedCategory]);

  // Tags disponíveis
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  const handleExport = () => {
    const data = {
      categories,
      tasks,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addActivity("export", "Dados exportados com sucesso");
    toast({ title: "Exportação concluída", description: "Arquivo JSON baixado com sucesso" });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Import categories (skip "Diário" to avoid duplicates)
        if (data.categories && Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            if (cat.name !== "Diário") {
              await addCategory(cat.name);
            }
          }
        }
        
        addActivity("import", `Arquivo ${file.name} importado`);
        toast({ 
          title: "Importação bem-sucedida", 
          description: "Dados importados com sucesso" 
        });
      } catch (error) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error("Import error:", error);
        }
        toast({ 
          title: "Erro na importação", 
          description: "Arquivo inválido",
          variant: "destructive" 
        });
      }
    };
    input.click();
  };
  
  const handleClearFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    setSortOption("manual");
  };

  const handleResetDaily = async () => {
    if (!columns.length) return;
    const firstColumn = columns[0];
    await resetDailyTasks(firstColumn.id);
    addActivity("daily_reset", "Kanban Diário resetado");
    setDailyBoardKey(k => k + 1); // Força refresh do board diário
  };

  if (loadingCategories || loadingColumns) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        onExport={handleExport}
        onImport={handleImport}
        onThemeToggle={toggleTheme}
        onViewAll={() => setViewMode(viewMode === "all" ? "category" : "all")}
        viewMode={viewMode}
      />

      <main className="ml-64">
        {/* Kanban Diário Fixo */}
        {dailyCategory && columns.length > 0 && (
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="px-6 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">📅 Kanban Diário</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDaily}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar Tudo
              </Button>
            </div>
            <KanbanBoard 
              key={dailyBoardKey}
              columns={columns} 
              categoryId={dailyCategory}
              compact
              isDailyKanban
            />
          </div>
        )}
        
        {/* Topbar + Filtros + Kanban Principal */}
        {((viewMode === "category" && selectedCategory) || viewMode === "all") && columns.length > 0 && (
          <>
            {viewMode === "category" && (
              <Topbar
                categories={categories.filter(c => c.name !== "Diário")}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onAddCategory={async (name) => {
                  await addCategory(name);
                  addActivity("category_created", `Categoria "${name}" criada`);
                  // Auto-select new category after creation
                  const newCat = categories.find(c => c.name === name);
                  if (newCat) {
                    setSelectedCategory(newCat.id);
                  }
                }}
              />
            )}

            {viewMode === "all" && (
              <div className="px-6 py-3 border-b bg-background">
                <h2 className="text-lg font-semibold">📊 Todos os Projetos</h2>
              </div>
            )}
            
            <SearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              tagFilter={tagFilter}
              onTagChange={setTagFilter}
              availableTags={availableTags}
              onClearFilters={handleClearFilters}
              sortOption={sortOption}
              onSortChange={setSortOption}
            />

            <KanbanBoard 
              columns={columns} 
              categoryId={viewMode === "all" ? "all" : selectedCategory}
              searchTerm={searchTerm}
              priorityFilter={priorityFilter}
              tagFilter={tagFilter}
              sortOption={sortOption}
              showCategoryBadge={viewMode === "all"}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default Index;
