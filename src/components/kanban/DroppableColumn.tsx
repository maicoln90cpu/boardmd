import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableColumnProps {
  id: string;
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function DroppableColumn({ id, children, isActive, className = "" }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
    data: {
      type: "column",
      columnId: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-all duration-200 ${
        isOver 
          ? "!bg-primary/15 ring-2 ring-primary/50 ring-inset" 
          : isActive 
            ? "bg-primary/5" 
            : ""
      }`}
    >
      {children}
    </div>
  );
}
