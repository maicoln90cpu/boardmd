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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateSelector({ open, onOpenChange }: TemplateSelectorProps) {
  const { templates, isLoading, applyTemplate, isApplying } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applicationMode, setApplicationMode] = useState<"add" | "replace">("add");

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    applyTemplate({ templateId, mode: applicationMode }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedTemplate(null);
        setApplicationMode("add");
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

        {/* Modo de Aplicação */}
        <Alert>
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium">Como deseja aplicar o template?</p>
              <RadioGroup value={applicationMode} onValueChange={(value) => setApplicationMode(value as "add" | "replace")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="cursor-pointer">
                    <span className="font-medium">Adicionar às colunas existentes</span>
                    <p className="text-sm text-muted-foreground">
                      Mantém suas colunas atuais e adiciona as novas do template
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="cursor-pointer">
                    <span className="font-medium">Substituir colunas não-originais</span>
                    <p className="text-sm text-muted-foreground">
                      Remove colunas extras (mantém as 3 originais) e adiciona as do template
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
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
