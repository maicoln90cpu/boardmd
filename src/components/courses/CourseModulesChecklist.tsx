import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface CourseModule {
  id: string;
  title: string;
  completed: boolean;
}

interface CourseModulesChecklistProps {
  modules: CourseModule[];
  onToggleModule: (moduleId: string) => void;
  readOnly?: boolean;
}

export function CourseModulesChecklist({ modules, onToggleModule, readOnly }: CourseModulesChecklistProps) {
  if (modules.length === 0) {
    return null;
  }

  const completedCount = modules.filter((m) => m.completed).length;
  const progress = Math.round((completedCount / modules.length) * 100);

  return (
    <div className="space-y-3">
      {/* Progress Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Progresso: {completedCount}/{modules.length} módulos
        </span>
        <span className="font-medium">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Modules List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {modules.map((module, index) => (
          <div
            key={module.id}
            className={cn(
              "flex items-start gap-3 p-2 rounded-md transition-colors",
              module.completed ? "bg-primary/5" : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              id={module.id}
              checked={module.completed}
              onCheckedChange={() => !readOnly && onToggleModule(module.id)}
              disabled={readOnly}
              className="mt-0.5"
            />
            <label
              htmlFor={module.id}
              className={cn(
                "flex-1 text-sm cursor-pointer select-none",
                module.completed && "line-through text-muted-foreground"
              )}
            >
              {index + 1}. {module.title}
            </label>
            {module.completed && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
