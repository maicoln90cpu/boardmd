import { FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NOTE_TEMPLATES, NoteTemplate } from "@/lib/noteTemplates";

interface NoteTemplateSelectorProps {
  onSelectTemplate: (template: NoteTemplate) => void;
}

export function NoteTemplateSelector({ onSelectTemplate }: NoteTemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: NoteTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Usar Template de Nota</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
          {NOTE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSelect(template)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
