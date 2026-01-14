import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  showValues?: boolean;
  colorClass?: string;
}

export function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  className,
  showPercentage = true,
  showValues = false,
  colorClass = "text-primary",
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColorClass = () => {
    if (percentage >= 100) return "text-green-500";
    if (percentage >= 75) return "text-emerald-500";
    if (percentage >= 50) return "text-yellow-500";
    return colorClass;
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={getColorClass()}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            className={cn("text-sm font-bold", getColorClass())}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        )}
        {showValues && (
          <span className="text-xs text-muted-foreground">
            {value}/{max}
          </span>
        )}
      </div>
    </div>
  );
}
