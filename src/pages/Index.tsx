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

function Index() {
  const { categories, loading: loadingCategories, addCategory } = useCategories();
  const { columns, loading: loadingColumns } = useColumns();
  const { toggleTheme } = useTheme();
  const { toast } = useToast();
  const { addActivity } = useActivityLog();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dailyCategory, setDailyCategory] = useState<string>("");
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  
  const { tasks } = useTasks(selectedCategory);

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
        
        addActivity("import", `Arquivo ${file.name} importado`);
        toast({ 
          title: "Importação bem-sucedida", 
          description: "Dados importados. Recarregue a página para ver as mudanças." 
        });
      } catch (error) {
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
      <Topbar
        categories={categories.filter(c => c.name !== "Diário")}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onAddCategory={(name) => {
          addCategory(name);
          addActivity("category_created", `Categoria "${name}" criada`);
        }}
      />
      
      <Sidebar
        onExport={handleExport}
        onImport={handleImport}
        onThemeToggle={toggleTheme}
      />

      <main className="ml-64 pt-16">
        {/* Kanban Diário Fixo */}
        {dailyCategory && columns.length > 0 && (
          <div className="sticky top-16 z-10 bg-background border-b">
            <div className="px-6 py-3 border-b">
              <h2 className="text-lg font-semibold">📅 Kanban Diário</h2>
            </div>
            <KanbanBoard 
              columns={columns} 
              categoryId={dailyCategory}
              compact
            />
          </div>
        )}
        
        {/* Filtros */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
          availableTags={availableTags}
          onClearFilters={handleClearFilters}
        />

        {/* Kanban Principal */}
        {selectedCategory && columns.length > 0 && (
          <KanbanBoard 
            columns={columns} 
            categoryId={selectedCategory}
            searchTerm={searchTerm}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
          />
        )}
      </main>
    </div>
  );
}

export default Index;
