import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/contexts/SwipeContext";

interface SwipeableTaskCardProps {
  taskId: string;
  children: React.ReactNode;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 70;
const SWIPE_DELAY = 80; // ms antes de considerar um swipe

export function SwipeableTaskCard({
  taskId,
  children,
  onComplete,
  onEdit,
  onDelete,
  isCompleted = false,
}: SwipeableTaskCardProps) {
  const { openCardId, setOpenCardId } = useSwipe();
  const [isOpen, setIsOpen] = useState<"left" | "right" | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const panStartTimeRef = useRef<number>(0);
  const panStartXRef = useRef<number>(0);
  const x = useMotionValue(0);
  
  // Transform para opacidade das ações
  const leftActionsOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightActionsOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  
  // Transform para escala das ações
  const leftActionsScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1]);
  const rightActionsScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  // Fechar quando outro card abrir (via contexto global)
  useEffect(() => {
    if (openCardId !== null && openCardId !== taskId && isOpen !== null) {
      setIsOpen(null);
      x.set(0);
    }
  }, [openCardId, taskId, isOpen, x]);

  // Sincronizar estado local com contexto
  useEffect(() => {
    if (isOpen !== null) {
      setOpenCardId(taskId);
    }
  }, [isOpen, taskId, setOpenCardId]);

  const handlePanStart = (_: any, info: PanInfo) => {
    panStartTimeRef.current = Date.now();
    panStartXRef.current = info.point.x;
  };

  const handlePan = (_: any, info: PanInfo) => {
    const elapsed = Date.now() - panStartTimeRef.current;
    
    // Só permitir swipe após delay mínimo
    if (elapsed < SWIPE_DELAY) return;
    
    // Limitar movimento
    const maxRight = ACTION_WIDTH * 2;
    const maxLeft = -ACTION_WIDTH;
    const newX = Math.max(maxLeft, Math.min(maxRight, info.offset.x));
    
    x.set(newX);
  };

  const handlePanEnd = (_: any, info: PanInfo) => {
    const elapsed = Date.now() - panStartTimeRef.current;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Se foi muito rápido (menos que delay), ignorar
    if (elapsed < SWIPE_DELAY) {
      x.set(0);
      return;
    }

    // Swipe para direita (completar/editar)
    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      setIsOpen("right");
      x.set(ACTION_WIDTH * 2);
    }
    // Swipe para esquerda (deletar)
    else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      setIsOpen("left");
      x.set(-ACTION_WIDTH);
    }
    // Fechar - voltar ao centro
    else {
      setIsOpen(null);
      setOpenCardId(null);
      x.set(0);
    }
  };

  const handleClose = () => {
    setIsOpen(null);
    setOpenCardId(null);
    x.set(0);
  };

  const handleComplete = () => {
    onComplete();
    handleClose();
  };

  const handleEdit = () => {
    onEdit();
    handleClose();
  };

  const handleDelete = () => {
    onDelete();
    handleClose();
  };

  return (
    <div className="relative overflow-hidden rounded-lg" ref={constraintsRef}>
      {/* Ações da esquerda (aparece ao arrastar para direita) - Completar e Editar */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-stretch z-20"
        style={{ 
          opacity: leftActionsOpacity,
          scale: leftActionsScale,
        }}
      >
        <button
          onClick={handleComplete}
          className={cn(
            "flex items-center justify-center w-[60px] transition-colors pointer-events-auto",
            isCompleted 
              ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700" 
              : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
          )}
        >
          {isCompleted ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Check className="h-5 w-5 text-white" />
          )}
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center justify-center w-[60px] bg-blue-500 hover:bg-blue-600 active:bg-blue-700 transition-colors pointer-events-auto"
        >
          <Pencil className="h-5 w-5 text-white" />
        </button>
      </motion.div>

      {/* Ações da direita (aparece ao arrastar para esquerda) - Deletar */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-stretch z-20"
        style={{ 
          opacity: rightActionsOpacity,
          scale: rightActionsScale,
        }}
      >
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-[70px] bg-destructive hover:bg-destructive/90 active:bg-destructive/80 transition-colors pointer-events-auto"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      </motion.div>

      {/* Card com gestures manuais (sem drag="x") */}
      <motion.div
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={{
          x: isOpen === "right" ? ACTION_WIDTH * 2 : isOpen === "left" ? -ACTION_WIDTH : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{ x, touchAction: 'pan-y pinch-zoom' }}
        className="relative z-10 bg-background"
      >
        {children}
      </motion.div>

      {/* Overlay para fechar quando aberto */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[15]"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
