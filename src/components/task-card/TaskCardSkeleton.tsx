import React from "react";
import { motion } from "framer-motion";

interface TaskCardSkeletonProps {
  visible: boolean;
}

export function TaskCardSkeleton({ visible }: TaskCardSkeletonProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-10 bg-card/80 backdrop-blur-[2px] rounded-lg flex items-center justify-center"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    </motion.div>
  );
}
