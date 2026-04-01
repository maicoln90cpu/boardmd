import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Hook centralizado para chamadas a Edge Functions (supabase.functions.invoke).
 * Agrupa por domínio e padroniza tratamento de erro/loading.
 */

// ============= Formatação de Notas =============

export function useFormatNote() {
  const [isLoading, setIsLoading] = useState(false);

  const formatNote = useCallback(async (content: string, action: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("format-note", {
        body: { content, action },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] format-note error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { formatNote, isLoading };
}

// ============= WhatsApp =============

export function useWhatsAppEdgeFunctions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendWhatsApp = useCallback(async (body: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", { body });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] send-whatsapp error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerDailySummary = useCallback(async (body: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-daily-summary", { body });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] whatsapp-daily-summary error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendWhatsApp, triggerDailySummary, isLoading };
}

// ============= Tools =============

export function useToolsEdgeFunctions() {
  const [isLoading, setIsLoading] = useState(false);

  const suggestTools = useCallback(async (functions: { name: string }[]) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tools", {
        body: { functions },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] suggest-tools error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDescription = useCallback(async (name: string, siteUrl: string | null) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool-description", {
        body: { name, siteUrl },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] generate-tool-description error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suggestAlternatives = useCallback(async (toolName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tool-alternatives", {
        body: { toolName },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] suggest-tool-alternatives error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggestTools, generateDescription, suggestAlternatives, isLoading };
}

// ============= Cursos =============

export function useCourseEdgeFunctions() {
  const [isLoading, setIsLoading] = useState(false);

  const parseCourseModules = useCallback(async (image: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-course-modules", {
        body: { image },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error("[EdgeFn] parse-course-modules error:", err);
      return { data: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { parseCourseModules, isLoading };
}
