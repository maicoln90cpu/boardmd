import React from "react";
import { Badge } from "@/components/ui/badge";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardTagsProps {
  tags: string[];
  hasMirror: boolean;
  hideBadges: boolean;
  densityMode: "comfortable" | "compact" | "ultra-compact";
}

export const TaskCardTags: React.FC<TaskCardTagsProps> = ({
  tags,
  hasMirror,
  hideBadges,
  densityMode,
}) => {
  const filteredTags = tags.filter((tag) => tag !== "espelho-diário");
  
  if (hideBadges || (!hasMirror && filteredTags.length === 0)) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center flex-wrap",
        densityMode === "compact" && "gap-1",
        densityMode === "comfortable" && "gap-1.5",
      )}
    >
      {hasMirror && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 border-0 font-medium shadow-sm transition-transform hover:scale-105",
            densityMode === "compact" && "text-[10px] px-1.5 py-0",
            densityMode === "comfortable" && "text-xs px-2 py-0.5",
          )}
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(168, 85, 247, 0.35)",
          }}
        >
          <Share2 className={cn(
            densityMode === "compact" ? "h-2.5 w-2.5" : "h-3 w-3"
          )} />
          Espelhada
        </Badge>
      )}

      {filteredTags.slice(0, 2).map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className={cn(
            densityMode === "compact" && "text-[10px] px-1 py-0",
            densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
          )}
        >
          {tag}
        </Badge>
      ))}

      {filteredTags.length > 2 && (
        <Badge
          variant="outline"
          className={cn(
            densityMode === "compact" && "text-[10px] px-1 py-0",
            densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
          )}
        >
          +{filteredTags.length - 2}
        </Badge>
      )}
    </div>
  );
};
