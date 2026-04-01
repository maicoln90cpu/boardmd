import { Save, RotateCcw } from "lucide-react";
import { WhatsAppTemplateCard } from "./WhatsAppTemplateCard";
import { Button } from "@/components/ui/button";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";

export function WhatsAppTemplates() {
  const {
    templates,
    columns,
    isLoading,
    isSaving,
    sendingTest,
    handleSave,
    handleReset,
    handleSendTest,
    updateTemplate,
    toggleColumnExclusion,
  } = useWhatsAppTemplates();

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-8">Carregando templates...</div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((tpl, idx) => (
        <WhatsAppTemplateCard
          key={tpl.template_type}
          tpl={tpl}
          index={idx}
          columns={columns}
          sendingTest={sendingTest}
          onUpdate={updateTemplate}
          onToggleColumn={toggleColumnExclusion}
          onSendTest={handleSendTest}
        />
      ))}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Templates
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
}
