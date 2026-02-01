import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Course, CourseFormData, CourseStats, CourseStatus, CoursePriority } from "@/types";

/**
 * Hook para gerenciar cursos do usuário
 * Inclui CRUD completo, estatísticas e Realtime
 */
export function useCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar cursos do usuário
  const fetchCourses = useCallback(async () => {
    if (!user?.id) {
      setCourses([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Cast para o tipo correto
      const typedCourses: Course[] = (data || []).map((c) => ({
        ...c,
        price: Number(c.price) || 0,
        current_module: c.current_module || 0,
        total_modules: c.total_modules || 1,
        priority: (c.priority as CoursePriority) || "medium",
        status: (c.status as CourseStatus) || "not_started",
      }));

      setCourses(typedCourses);
    } catch (error) {
      logger.error("[useCourses] Error fetching courses:", error);
      toast.error("Erro ao carregar cursos");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Carregar cursos inicialmente e configurar Realtime
  useEffect(() => {
    fetchCourses();

    if (!user?.id) return;

    // Configurar subscription Realtime
    const channel = supabase
      .channel("courses-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.log("[useCourses] Realtime event:", payload.eventType);

          if (payload.eventType === "INSERT") {
            const newCourse = payload.new as Course;
            setCourses((prev) => [
              {
                ...newCourse,
                price: Number(newCourse.price) || 0,
                current_module: newCourse.current_module || 0,
                total_modules: newCourse.total_modules || 1,
                priority: (newCourse.priority as CoursePriority) || "medium",
                status: (newCourse.status as CourseStatus) || "not_started",
              },
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Course;
            setCourses((prev) =>
              prev.map((c) =>
                c.id === updated.id
                  ? {
                      ...updated,
                      price: Number(updated.price) || 0,
                      current_module: updated.current_module || 0,
                      total_modules: updated.total_modules || 1,
                      priority: (updated.priority as CoursePriority) || "medium",
                      status: (updated.status as CourseStatus) || "not_started",
                    }
                  : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setCourses((prev) => prev.filter((c) => c.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCourses]);

  // Adicionar curso
  const addCourse = useCallback(
    async (data: CourseFormData & { modules_checklist?: any[] }): Promise<Course | null> => {
      if (!user?.id) {
        toast.error("Você precisa estar logado");
        return null;
      }

      try {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({
            user_id: user.id,
            name: data.name,
            url: data.url || null,
            price: data.price || 0,
            current_episode: data.current_episode || 0,
            total_episodes: data.total_episodes || 1,
            current_module: data.current_module || 0,
            total_modules: data.total_modules || 1,
            priority: data.priority || "medium",
            status: data.status || "not_started",
            category: data.category || null,
            platform: data.platform || null,
            notes: data.notes || null,
            started_at: data.started_at || null,
            is_favorite: data.is_favorite || false,
            modules_checklist: data.modules_checklist || [],
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Curso adicionado!");
        return newCourse as Course;
      } catch (error) {
        logger.error("[useCourses] Error adding course:", error);
        toast.error("Erro ao adicionar curso");
        return null;
      }
    },
    [user?.id]
  );

  // Atualizar curso
  const updateCourse = useCallback(
    async (id: string, data: Partial<CourseFormData> & { modules_checklist?: any[] }): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const updateData: Record<string, unknown> = { ...data };

        // Auto-preencher datas baseado no status
        if (data.status === "in_progress" && !data.started_at) {
          const course = courses.find((c) => c.id === id);
          if (!course?.started_at) {
            updateData.started_at = new Date().toISOString().split("T")[0];
          }
        }

        if (data.status === "completed") {
          updateData.completed_at = new Date().toISOString().split("T")[0];
          // Se completou, atualizar episódio para o total
          const course = courses.find((c) => c.id === id);
          if (course) {
            updateData.current_episode = course.total_episodes;
          }
        }

        const { error } = await supabase
          .from("courses")
          .update(updateData)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Curso atualizado!");
        return true;
      } catch (error) {
        logger.error("[useCourses] Error updating course:", error);
        toast.error("Erro ao atualizar curso");
        return false;
      }
    },
    [user?.id, courses]
  );

  // Excluir curso
  const deleteCourse = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error } = await supabase
          .from("courses")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Curso excluído!");
        return true;
      } catch (error) {
        logger.error("[useCourses] Error deleting course:", error);
        toast.error("Erro ao excluir curso");
        return false;
      }
    },
    [user?.id]
  );

  // Toggle favorito
  const toggleFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      const course = courses.find((c) => c.id === id);
      if (!course) return false;

      return updateCourse(id, { is_favorite: !course.is_favorite });
    },
    [courses, updateCourse]
  );

  // Atualizar progresso (episódio atual)
  const updateProgress = useCallback(
    async (id: string, currentEpisode: number): Promise<boolean> => {
      const course = courses.find((c) => c.id === id);
      if (!course) return false;

      const updates: Partial<CourseFormData> = {
        current_episode: Math.min(currentEpisode, course.total_episodes),
      };

      // Auto-atualizar status baseado no progresso
      if (currentEpisode > 0 && course.status === "not_started") {
        updates.status = "in_progress";
      }
      if (currentEpisode >= course.total_episodes) {
        updates.status = "completed";
      }

      return updateCourse(id, updates);
    },
    [courses, updateCourse]
  );

  // Incrementar/Decrementar episódio
  const incrementEpisode = useCallback(
    async (id: string, increment: boolean = true): Promise<boolean> => {
      const course = courses.find((c) => c.id === id);
      if (!course) return false;

      const newEpisode = increment
        ? Math.min(course.current_episode + 1, course.total_episodes)
        : Math.max(course.current_episode - 1, 0);
      
      return updateProgress(id, newEpisode);
    },
    [courses, updateProgress]
  );

  // Incrementar/Decrementar módulo
  const incrementModule = useCallback(
    async (id: string, increment: boolean = true): Promise<boolean> => {
      const course = courses.find((c) => c.id === id);
      if (!course) return false;

      const totalModules = course.total_modules || 1;
      const currentModule = course.current_module || 0;
      
      const newModule = increment
        ? Math.min(currentModule + 1, totalModules)
        : Math.max(currentModule - 1, 0);
      
      const updates: Partial<CourseFormData> = {
        current_module: newModule,
      };

      // Auto-atualizar status baseado no progresso de módulos
      if (newModule > 0 && course.status === "not_started") {
        updates.status = "in_progress";
      }
      if (newModule >= totalModules && course.current_episode >= course.total_episodes) {
        updates.status = "completed";
      }

      return updateCourse(id, updates);
    },
    [courses, updateCourse]
  );

  // Estatísticas computadas
  const stats: CourseStats = useMemo(() => {
    const total = courses.length;
    const notStarted = courses.filter((c) => c.status === "not_started").length;
    const inProgress = courses.filter((c) => c.status === "in_progress").length;
    const completed = courses.filter((c) => c.status === "completed").length;
    const paused = courses.filter((c) => c.status === "paused").length;

    const totalInvestment = courses.reduce((acc, c) => acc + (c.price || 0), 0);

    const totalEpisodes = courses.reduce((acc, c) => acc + c.total_episodes, 0);
    const watchedEpisodes = courses.reduce(
      (acc, c) => acc + c.current_episode,
      0
    );

    const averageProgress =
      total > 0
        ? courses.reduce((acc, c) => {
            const progress =
              c.total_episodes > 0
                ? (c.current_episode / c.total_episodes) * 100
                : 0;
            return acc + progress;
          }, 0) / total
        : 0;

    return {
      total,
      notStarted,
      inProgress,
      completed,
      paused,
      totalInvestment,
      averageProgress: Math.round(averageProgress),
      totalEpisodes,
      watchedEpisodes,
    };
  }, [courses]);

  // Cursos filtrados por status
  const coursesByStatus = useMemo(
    () => ({
      notStarted: courses.filter((c) => c.status === "not_started"),
      inProgress: courses.filter((c) => c.status === "in_progress"),
      completed: courses.filter((c) => c.status === "completed"),
      paused: courses.filter((c) => c.status === "paused"),
      favorites: courses.filter((c) => c.is_favorite),
    }),
    [courses]
  );

  // Categorias únicas para filtro
  const uniqueCategories = useMemo(() => {
    const categories = courses
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c));
    return [...new Set(categories)].sort();
  }, [courses]);

  // Plataformas únicas para filtro
  const uniquePlatforms = useMemo(() => {
    const platforms = courses
      .map((c) => c.platform)
      .filter((p): p is string => Boolean(p));
    return [...new Set(platforms)].sort();
  }, [courses]);

  return {
    courses,
    isLoading,
    stats,
    coursesByStatus,
    uniqueCategories,
    uniquePlatforms,
    addCourse,
    updateCourse,
    deleteCourse,
    toggleFavorite,
    updateProgress,
    incrementEpisode,
    incrementModule,
    refetch: fetchCourses,
  };
}
