import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
}

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 70;

export function SwipeableTaskCard({
  children,
  onComplete,
  onEdit,
  onDelete,
  isCompleted = false,
}: SwipeableTaskCardProps) {
  const [isOpen, setIsOpen] = useState<"left" | "right" | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  // Transform para opacidade das ações
  const leftActionsOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightActionsOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  
  // Transform para escala das ações
  const leftActionsScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1]);
  const rightActionsScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe para direita (completar/editar)
    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      setIsOpen("right");
    }
    // Swipe para esquerda (deletar)
    else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      setIsOpen("left");
    }
    // Fechar
    else {
      setIsOpen(null);
    }
  };

  const handleClose = () => {
    setIsOpen(null);
  };

  const handleComplete = () => {
    onComplete();
    setIsOpen(null);
  };

  const handleEdit = () => {
    onEdit();
    setIsOpen(null);
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(null);
  };

  return (
    <div className="relative overflow-hidden rounded-lg" ref={constraintsRef}>
      {/* Ações da esquerda (aparece ao arrastar para direita) - Completar e Editar */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-stretch"
        style={{ 
          opacity: leftActionsOpacity,
          scale: leftActionsScale,
        }}
      >
        <button
          onClick={handleComplete}
          className={cn(
            "flex items-center justify-center w-[60px] transition-colors",
            isCompleted 
              ? "bg-orange-500 hover:bg-orange-600" 
              : "bg-emerald-500 hover:bg-emerald-600"
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
          className="flex items-center justify-center w-[60px] bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          <Pencil className="h-5 w-5 text-white" />
        </button>
      </motion.div>

      {/* Ações da direita (aparece ao arrastar para esquerda) - Deletar */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ 
          opacity: rightActionsOpacity,
          scale: rightActionsScale,
        }}
      >
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-[70px] bg-destructive hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      </motion.div>

      {/* Card arrastável */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: ACTION_WIDTH * 2 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{
          x: isOpen === "right" ? ACTION_WIDTH * 2 : isOpen === "left" ? -ACTION_WIDTH : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{ x }}
        className="relative z-10 bg-background touch-pan-y"
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
            className="fixed inset-0 z-0"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
