import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard } from "./TemplateCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateSelector({ open, onOpenChange }: TemplateSelectorProps) {
  const { templates, isLoading, applyTemplate, isApplying } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    applyTemplate(templateId, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedTemplate(null);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Templates de Projetos</DialogTitle>
          <DialogDescription>
            Escolha um template para começar rapidamente com uma estrutura pré-configurada
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates?.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={handleApplyTemplate}
                  isApplying={isApplying && selectedTemplate === template.id}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
