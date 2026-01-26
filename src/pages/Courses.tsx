import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, GraduationCap } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { CourseStats } from "@/components/courses/CourseStats";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseModal } from "@/components/courses/CourseModal";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { EmptyState } from "@/components/ui/empty-state";
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

export default function Courses() {
  const { 
    courses, 
    isLoading, 
    stats, 
    addCourse, 
    updateCourse, 
    deleteCourse,
    toggleFavorite,
    incrementEpisode 
  } = useCourses();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
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
  }, [courses, searchTerm, statusFilter, categoryFilter, priorityFilter]);

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

  const handleIncrementEpisode = (id: string, increment: boolean) => {
    incrementEpisode(id, increment);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
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
    );
  }

  return (
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
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Stats */}
      <CourseStats stats={stats} />

      {/* Filters */}
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
      />

      {/* Course List */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          variant="tasks"
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
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
              onIncrementEpisode={handleIncrementEpisode}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CourseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        course={editingCourse}
        onSubmit={handleSubmit}
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
  );
}
