import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Auth } from "@/components/Auth";
import { Topbar } from "@/components/Topbar";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { categories, addCategory, loading: categoriesLoading } = useCategories();
  const { columns, loading: columnsLoading } = useColumns();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (user && categories.length === 0 && !categoriesLoading) {
      const initializeDefaultCategories = async () => {
        await addCategory("Trabalho");
        await addCategory("Projetos");
        await addCategory("Pessoal");
      };
      initializeDefaultCategories();
    }
  }, [user, categories, categoriesLoading]);

  const handleExport = () => {
    toast({ title: "Exportar dados", description: "Funcionalidade em desenvolvimento" });
  };

  const handleImport = () => {
    toast({ title: "Importar dados", description: "Funcionalidade em desenvolvimento" });
  };

  const handleThemeToggle = () => {
    const themes: ("light" | "dark" | "auto")[] = ["light", "dark", "auto"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    toast({ title: `Tema alterado para ${nextTheme}` });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const loading = categoriesLoading || columnsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Preparando seu Kanban...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onAddCategory={addCategory}
      />
      <Sidebar
        onExport={handleExport}
        onImport={handleImport}
        onThemeToggle={handleThemeToggle}
      />
      <main className="ml-64 mt-16 p-6">
        {selectedCategory && columns.length > 0 && (
          <KanbanBoard columns={columns} categoryId={selectedCategory} />
        )}
      </main>
    </div>
  );
};

export default Index;
