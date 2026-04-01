import { Plus, Calculator } from "lucide-react";
import { useState } from "react";
import { CostThemeCard } from "@/components/costs/CostThemeCard";
import { CostThemeDetail } from "@/components/costs/CostThemeDetail";
import { CostThemeModal } from "@/components/costs/CostThemeModal";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCostCalculator } from "@/hooks/useCostCalculator";

export default function CostCalculator() {
  const {
    themes,
    loadingThemes,
    useThemeItems,
    createTheme,
    updateTheme,
    deleteTheme,
    createItem,
    deleteItem,
    updateItem,
    calculateTotals,
    generateReportText,
  } = useCostCalculator();

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) || null;
  const { data: items = [] } = useThemeItems(selectedThemeId);

  const totals = selectedTheme ? calculateTotals(items, selectedTheme) : { byOriginal: {}, converted: {}, byCategory: {}, ccFees: 0, ccIOF: 0 };
  const reportText = selectedTheme ? generateReportText(selectedTheme, items) : "";

  return (
    <div className="flex h-screen w-full bg-background pt-14 md:pt-0">
      <Sidebar
        onCategorySelect={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={() => {}}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {selectedTheme ? (
            <CostThemeDetail
              theme={selectedTheme}
              items={items}
              totals={totals}
              reportText={reportText}
              onBack={() => setSelectedThemeId(null)}
              onAddItem={(item) =>
                createItem.mutate({ ...item, theme_id: selectedTheme.id })
              }
              onDeleteItem={(id) => deleteItem.mutate(id)}
              onUpdateItem={(updates) => updateItem.mutate(updates)}
              onUpdateRates={(rates) =>
                updateTheme.mutate({ id: selectedTheme.id, exchange_rates: rates })
              }
              onUpdateTheme={(updates) =>
                updateTheme.mutate({ id: selectedTheme.id, ...updates })
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">Calculador de Custos</h1>
                </div>
                <Button onClick={() => setShowModal(true)} className="gap-1">
                  <Plus className="h-4 w-4" /> Novo Tema
                </Button>
              </div>

              {loadingThemes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : themes.length === 0 ? (
                <EmptyState
                  variant="tasks"
                  title="Nenhum tema de custos"
                  description="Crie um tema para começar a registrar e calcular seus gastos."
                  actionLabel="Criar Tema"
                  onAction={() => setShowModal(true)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {themes.map((theme) => (
                    <ThemeCardWrapper
                      key={theme.id}
                      theme={theme}
                      onOpen={() => setSelectedThemeId(theme.id)}
                      onDelete={() => deleteTheme.mutate(theme.id)}
                      calculateTotals={calculateTotals}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <CostThemeModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={(data) => createTheme.mutate(data)}
          />
        </main>
      </div>
    </div>
  );
}

// Wrapper to fetch items per theme for card display
function ThemeCardWrapper({
  theme,
  onOpen,
  onDelete,
  calculateTotals,
}: {
  theme: any;
  onOpen: () => void;
  onDelete: () => void;
  calculateTotals: any;
}) {
  const { useThemeItems } = useCostCalculator();
  const { data: items = [] } = useThemeItems(theme.id);
  const totals = calculateTotals(items, theme);

  return (
    <CostThemeCard
      theme={theme}
      itemCount={items.length}
      converted={totals.converted}
      onOpen={onOpen}
      onDelete={onDelete}
    />
  );
}
