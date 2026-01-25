import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskCardTagsProps {
  tags: string[];
  hideBadges: boolean;
  densityMode: "comfortable" | "compact" | "ultra-compact";
}

export const TaskCardTags: React.FC<TaskCardTagsProps> = ({
  tags,
  hideBadges,
  densityMode,
}) => {
  // Filter out legacy/system tags
  const filteredTags = tags.filter((tag) => tag !== "recorrente");
  
  if (hideBadges || filteredTags.length === 0) {
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
      {filteredTags.slice(0, 2).map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className={cn(
            "bg-muted/50",
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
            "bg-muted/30 text-muted-foreground",
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
