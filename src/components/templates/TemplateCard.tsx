import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectTemplate } from "@/hooks/useTemplates";
import { CheckCircle2, Loader2, Users } from "lucide-react";

interface TemplateCardProps {
  template: ProjectTemplate;
  onApply: (templateId: string) => void;
  isApplying: boolean;
}

export function TemplateCard({ template, onApply, isApplying }: TemplateCardProps) {
  const { categories, columns, tasks } = template.config;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{template.icon}</div>
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preview das configurações */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{categories.length} categoria(s)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{columns.length} coluna(s)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{tasks.length} tarefa(s) iniciais</span>
          </div>
        </div>

        {/* Colunas preview */}
        <div className="flex flex-wrap gap-2">
          {columns.slice(0, 4).map((col, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {col.name}
            </Badge>
          ))}
          {columns.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{columns.length - 4}
            </Badge>
          )}
        </div>

        {/* Usage count */}
        {template.usage_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Usado {template.usage_count}x</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onApply(template.id)}
          disabled={isApplying}
          className="w-full"
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aplicando...
            </>
          ) : (
            "Usar Template"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
