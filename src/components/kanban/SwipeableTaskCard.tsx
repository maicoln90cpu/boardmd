import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSwipe } from "@/contexts/SwipeContext";
import { cn } from "@/lib/utils";

interface SwipeableTaskCardProps {
  taskId: string;
  children: React.ReactNode;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
}

const SWIPE_THRESHOLD = 50;
const ACTION_WIDTH = 70;
const LOCK_ANGLE = 20; // graus — abaixo disso é horizontal

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
  const x = useMotionValue(0);

  // Refs para controle de toque manual
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const isDraggingRef = useRef(false);

  const leftActionsOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightActionsOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const leftActionsScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1]);
  const rightActionsScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  // Fechar quando outro card abrir
  useEffect(() => {
    if (openCardId !== null && openCardId !== taskId && isOpen !== null) {
      setIsOpen(null);
      x.set(0);
    }
  }, [openCardId, taskId, isOpen, x]);

  useEffect(() => {
    if (isOpen !== null) {
      setOpenCardId(taskId);
    }
  }, [isOpen, taskId, setOpenCardId]);

  const handleClose = useCallback(() => {
    setIsOpen(null);
    setOpenCardId(null);
    x.set(0);
  }, [setOpenCardId, x]);

  // --- Touch handlers manuais ---
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      currentXRef.current = 0;
      directionLockedRef.current = null;
      isDraggingRef.current = false;
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Determinar direção nos primeiros pixels de movimento
      if (directionLockedRef.current === null) {
        const absDx = Math.abs(deltaX);
        const absDy = Math.abs(deltaY);

        // Esperar pelo menos 8px de movimento para decidir
        if (absDx < 8 && absDy < 8) return;

        const angle = Math.atan2(absDy, absDx) * (180 / Math.PI);

        if (angle < LOCK_ANGLE) {
          directionLockedRef.current = "horizontal";
          isDraggingRef.current = true;
        } else {
          directionLockedRef.current = "vertical";
          return;
        }
      }

      if (directionLockedRef.current !== "horizontal") return;

      // Prevenir scroll vertical enquanto arrasta horizontalmente
      e.preventDefault();

      const maxRight = ACTION_WIDTH * 2;
      const maxLeft = -ACTION_WIDTH;
      const clampedX = Math.max(maxLeft, Math.min(maxRight, deltaX));

      currentXRef.current = clampedX;
      x.set(clampedX);
    },
    [x],
  );

  const handleTouchEnd = useCallback(() => {
    if (directionLockedRef.current !== "horizontal" || !isDraggingRef.current) {
      directionLockedRef.current = null;
      return;
    }

    const offset = currentXRef.current;

    if (offset > SWIPE_THRESHOLD) {
      setIsOpen("right");
      x.set(ACTION_WIDTH * 2);
    } else if (offset < -SWIPE_THRESHOLD) {
      setIsOpen("left");
      x.set(-ACTION_WIDTH);
    } else {
      setIsOpen(null);
      setOpenCardId(null);
      x.set(0);
    }

    directionLockedRef.current = null;
    isDraggingRef.current = false;
  }, [x, setOpenCardId]);

  const handleComplete = useCallback(() => {
    onComplete();
    handleClose();
  }, [onComplete, handleClose]);

  const handleEdit = useCallback(() => {
    onEdit();
    handleClose();
  }, [onEdit, handleClose]);

  const handleDelete = useCallback(() => {
    onDelete();
    handleClose();
  }, [onDelete, handleClose]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Ações da esquerda (aparece ao arrastar para direita) */}
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
              : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700",
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

      {/* Ações da direita (aparece ao arrastar para esquerda) */}
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

      {/* Card com touch handlers manuais */}
      <motion.div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        animate={{
          x:
            isOpen === "right"
              ? ACTION_WIDTH * 2
              : isOpen === "left"
                ? -ACTION_WIDTH
                : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{ x }}
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
