import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const baseBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full text-xs font-medium transition-all focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
        info: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20",
        outline: "text-foreground border border-border bg-transparent",
        ghost: "bg-muted/50 text-muted-foreground",
        pinned: "", // Estilo aplicado via getPinnedBadgeStyle()
        notebook: "", // Estilo aplicado via getNotebookBadgeStyle()
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Estilos premium com gradientes para badges
export const getPinnedBadgeStyle = () => ({
  background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
  color: "#ffffff",
  boxShadow: "0 2px 6px rgba(234, 179, 8, 0.3)",
  border: "none",
});

export const getNotebookBadgeStyle = (color?: string) => ({
  background: color 
    ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
    : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  color: "#ffffff",
  boxShadow: color 
    ? `0 2px 6px ${color}4d`
    : "0 2px 6px rgba(139, 92, 246, 0.3)",
  border: "none",
});

export interface BaseBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof baseBadgeVariants> {
  icon?: React.ReactNode;
}

function BaseBadge({ className, variant, size, icon, children, ...props }: BaseBadgeProps) {
  return (
    <span className={cn(baseBadgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}

export { BaseBadge, baseBadgeVariants };
