import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GraduationCap, Settings2, LayoutDashboard, List } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { useCourseCategories } from "@/hooks/useCourseCategories";
import { CourseStats } from "@/components/courses/CourseStats";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseModal } from "@/components/courses/CourseModal";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { CourseSortOptions, type CourseSortOption } from "@/components/courses/CourseSortOptions";
import { CourseCategoryManager } from "@/components/courses/CourseCategoryManager";
import { CoursesDashboard } from "@/components/courses/CoursesDashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import confetti from "canvas-confetti";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Course, CourseFormData } from "@/types";

// Função para disparar confetti
const triggerConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

export default function Courses() {
  const { toggleTheme } = useTheme();
  const { 
    courses, 
    isLoading, 
    stats, 
    addCourse, 
    updateCourse, 
    deleteCourse,
    toggleFavorite,
    incrementEpisode,
    incrementModule
  } = useCourses();

  const { categories: dbCategories, isLoading: categoriesLoading } = useCourseCategories();

  // Tab state
  const [activeTab, setActiveTab] = useState<"list" | "dashboard">("list");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Category manager
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOption, setSortOption] = useState<CourseSortOption>("updated_at_desc");

  // Track previously completed courses for confetti
  const [previouslyCompleted, setPreviouslyCompleted] = useState<Set<string>>(() => {
    const completed = courses.filter(c => c.status === "completed").map(c => c.id);
    return new Set(completed);
  });

  // Check for newly completed courses and trigger confetti
  useEffect(() => {
    const currentlyCompleted = courses.filter(c => c.status === "completed");
    
    for (const course of currentlyCompleted) {
      if (!previouslyCompleted.has(course.id)) {
        // Novo curso completado!
        triggerConfetti();
        break; // Apenas um confetti por vez
      }
    }

    setPreviouslyCompleted(new Set(currentlyCompleted.map(c => c.id)));
  }, [courses]);

  // Sort and filter courses
  const filteredAndSortedCourses = useMemo(() => {
    // Primeiro, filtrar
    let result = courses.filter((course) => {
      // Search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          course.name.toLowerCase().includes(search) ||
          course.platform?.toLowerCase().includes(search) ||
          course.category?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && course.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && course.category !== categoryFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && course.priority !== priorityFilter) {
        return false;
      }

      return true;
    });

    // Depois, ordenar
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    result.sort((a, b) => {
      switch (sortOption) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "progress_asc": {
          const progressA = a.total_episodes > 0 ? a.current_episode / a.total_episodes : 0;
          const progressB = b.total_episodes > 0 ? b.current_episode / b.total_episodes : 0;
          return progressA - progressB;
        }
        case "progress_desc": {
          const progressA = a.total_episodes > 0 ? a.current_episode / a.total_episodes : 0;
          const progressB = b.total_episodes > 0 ? b.current_episode / b.total_episodes : 0;
          return progressB - progressA;
        }
        case "started_at_asc":
          return (a.started_at || "").localeCompare(b.started_at || "");
        case "started_at_desc":
          return (b.started_at || "").localeCompare(a.started_at || "");
        case "priority_asc":
          return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        case "priority_desc":
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case "updated_at_desc":
        default:
          return (b.updated_at || "").localeCompare(a.updated_at || "");
      }
    });

    return result;
  }, [courses, searchTerm, statusFilter, categoryFilter, priorityFilter, sortOption]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingCourse(null);
    setModalOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setModalOpen(true);
  };

  const handleDelete = (course: Course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (courseToDelete) {
      await deleteCourse(courseToDelete.id);
      setCourseToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmit = async (data: CourseFormData) => {
    if (editingCourse) {
      await updateCourse(editingCourse.id, data);
    } else {
      await addCourse(data);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
  };

  const handleIncrementEpisode = useCallback((id: string, increment: boolean) => {
    incrementEpisode(id, increment);
  }, [incrementEpisode]);

  const handleIncrementModule = useCallback((id: string, increment: boolean) => {
    incrementModule(id, increment);
  }, [incrementModule]);

  if (isLoading || categoriesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar
          onExport={() => {}}
          onImport={() => {}}
          onThemeToggle={toggleTheme}
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
      />
      <div className="flex-1 overflow-auto pb-[140px] md:pb-0">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Meus Cursos</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus cursos e acompanhe seu progresso
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCategoryManagerOpen(true)}
                title="Gerenciar Categorias"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "list" | "dashboard")}>
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            {/* List Tab */}
            <TabsContent value="list" className="space-y-6 mt-6">
              {/* Stats */}
              <CourseStats stats={stats} />

              {/* Filters and Sort */}
              <div className="flex flex-col gap-3">
                <CourseFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  priorityFilter={priorityFilter}
                  onPriorityChange={setPriorityFilter}
                  onClearFilters={handleClearFilters}
                  categories={dbCategories}
                />
                <div className="flex justify-end">
                  <CourseSortOptions value={sortOption} onChange={setSortOption} />
                </div>
              </div>

              {/* Course List */}
              {filteredAndSortedCourses.length === 0 ? (
                <EmptyState
                  variant="courses"
                  title={courses.length === 0 ? "Nenhum curso cadastrado" : "Nenhum curso encontrado"}
                  description={
                    courses.length === 0
                      ? "Adicione seu primeiro curso para começar a acompanhar seu progresso de aprendizado."
                      : "Tente ajustar os filtros para encontrar o que procura."
                  }
                  actionLabel={courses.length === 0 ? "Adicionar Curso" : undefined}
                  onAction={courses.length === 0 ? handleOpenCreate : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      categories={dbCategories}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleFavorite={toggleFavorite}
                      onIncrementEpisode={handleIncrementEpisode}
                      onIncrementModule={handleIncrementModule}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-6">
              <CoursesDashboard courses={courses} />
            </TabsContent>
          </Tabs>

          {/* Modal */}
          <CourseModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            course={editingCourse}
            onSubmit={handleSubmit}
            categories={dbCategories}
          />

          {/* Category Manager */}
          <CourseCategoryManager
            open={categoryManagerOpen}
            onOpenChange={setCategoryManagerOpen}
          />

          {/* Delete Confirmation */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{courseToDelete?.name}"? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
