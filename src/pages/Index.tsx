import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TaskModal } from "@/components/TaskModal";
import { DailyReviewModal } from "@/components/DailyReviewModal";
import { ImportPreviewModal } from "@/components/ImportPreviewModal";
import { ActivityHistory } from "@/components/ActivityHistory";
import { ProjectsKanbanView } from "@/components/kanban/ProjectsKanbanView";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/ui/useToast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/ui/useMobile";
import { KanbanLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useWeeklyAutomation } from "@/hooks/useWeeklyAutomation";
import { useTaskReset } from "@/hooks/tasks/useTaskReset";
import { useDataImportExport } from "@/hooks/useDataImportExport";
import { useDailyReview } from "@/hooks/useDailyReview";
import { useIndexState } from "@/hooks/useIndexState";
import { useViewModeHandlers } from "@/hooks/useViewModeHandlers";
import { useSettingsUpdaters } from "@/hooks/useSettingsUpdaters";

function Index() {
  const isMobile = useIsMobile();
  const { toggleTheme } = useTheme();
  const { toast } = useToast();

  // Main state hook
  const state = useIndexState();

  // View mode handlers
  const viewHandlers = useViewModeHandlers({
    allTasks: state.allTasks,
    categories: state.categories,
    selectedCategory: state.selectedCategory,
    categoryFilter: state.categoryFilter,
    categoryFilterInitialized: state.categoryFilterInitialized,
    selectedCategoryFilterMobile: state.selectedCategoryFilterMobile,
    isMobile,
    simplifiedMode: state.simplifiedMode,
    getVisibleColumns: state.getVisibleColumns,
    refreshProjectsBoard: state.refreshProjectsBoard,
  });

  // Settings updaters
  const settingsUpdaters = useSettingsUpdaters();

  // Due date alerts hook
  useDueDateAlerts(state.allTasks);

  // Weekly automation
  useWeeklyAutomation({
    tasks: state.allTasks,
    columns: state.columns,
    autoMoveEnabled: state.settings.kanban.autoMoveToCurrentWeek,
    excludeColumnNames: state.settings.kanban.excludeFromWeeklyAutomation || ['recorrente', 'recorrentes', 'arquivado']
  });

  // Task reset hook
  const { handleResetRecurrentTasks } = useTaskReset({
    columns: state.columns,
    resetAllTasksToFirstColumn: async () => {},
    onBoardRefresh: state.refreshProjectsBoard
  });

  // Import/export hook
  const {
    handleExport,
    handleImport,
    handleConfirmImport,
    showImportPreview,
    setShowImportPreview,
    importValidation,
    importMerge,
    importFileName,
    isImporting
  } = useDataImportExport({
    categories: state.categories,
    tasks: state.allTasks,
    columns: state.columns,
    addCategory: state.addCategory,
    onBoardRefresh: state.refreshAllBoards
  });

  // Daily review hook
  const { showDailyReview, setShowDailyReview } = useDailyReview({
    tasks: state.allTasks,
    settings: state.settings,
    updateSettings: state.updateSettings,
    saveSettings: state.saveSettings,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => {
      state.searchInputRef.current?.focus();
    },
    onNewTask: () => {
      state.setShowQuickTaskModal(true);
    },
    onClearSelection: () => {
      if (state.selectedCategory) {
        state.setSelectedCategory(null);
        state.setCategoryFilter(state.categories.map(c => c.id));
        toast({
          title: "Filtro limpo",
          description: "Exibindo todas as tarefas",
        });
      }
    },
    hasActiveSelection: !!state.selectedCategory,
  });

  // Loading state
  if (state.loadingCategories || state.loadingColumns) {
    return <KanbanLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-[140px] md:pb-0 flex">
      <Sidebar 
        onExport={handleExport} 
        onImport={handleImport} 
        onThemeToggle={toggleTheme} 
        onCategorySelect={state.setSelectedCategory}
        selectedCategoryId={state.selectedCategory}
      />

      <main className="flex-1 overflow-auto">
        {/* Projects Kanban - always visible now */}
        {viewHandlers.visibleColumns.length > 0 && (
          <ProjectsKanbanView
            columns={viewHandlers.visibleColumns}
            allColumns={state.columns}
            categories={state.categories}
            tasks={viewHandlers.tasks}
            filteredTasks={viewHandlers.filteredTasks}
            notes={state.notes}
            notebooks={state.notebooks}
            availableTags={viewHandlers.availableTags}
            taskCounters={viewHandlers.taskCounters}
            boardKey={state.projectsBoardKey}
            isMobile={isMobile}
            simplifiedMode={state.simplifiedMode}
            densityMode={state.densityMode}
            hideBadges={state.hideBadgesMobile}
            gridColumns={state.projectsGridColumnsMobile}
            displayMode={state.displayMode}
            sortOption={state.projectsSortOption}
            searchTerm={state.searchTerm}
            priorityFilter={state.priorityFilter}
            tagFilter={state.tagFilter}
            dueDateFilter={state.projectsDueDateFilter}
            categoryFilter={state.categoryFilter}
            categoryFilterInitialized={state.categoryFilterInitialized}
            selectedCategory={state.selectedCategory}
            onSearchChange={state.setSearchTerm}
            onPriorityChange={state.setPriorityFilter}
            onTagChange={state.setTagFilter}
            onDueDateChange={state.setProjectsDueDateFilter}
            onCategoryChange={state.setCategoryFilter}
            onDisplayModeChange={(value) => state.setDisplayMode(value as "by_category" | "all_tasks")}
            onClearFilters={() => {
              state.handleClearFilters();
              state.setProjectsDueDateFilter("all");
            }}
            onClearCategorySelection={() => state.setSelectedCategory("")}
            onTaskSelect={state.handleTaskSelect}
            onEqualizeColumns={viewHandlers.handleEqualizeColumns}
            hiddenColumns={state.hiddenColumns}
            onToggleColumnVisibility={state.toggleColumnVisibility}
            onDeleteColumn={state.deleteColumn}
            onResetToDefault={state.resetToDefaultView}
            onRenameColumn={state.renameColumn}
            onAddColumn={state.addColumn}
            onReorderColumns={state.reorderColumns}
            onToggleKanbanVisibility={state.toggleColumnKanbanVisibility}
            showStats={state.showStats}
            onShowStatsChange={state.setShowStats}
            showColumnManager={state.showColumnManager}
            onShowColumnManagerChange={state.setShowColumnManager}
          />
        )}
      </main>

      {/* History Dialog */}
      <Dialog open={state.showHistory} onOpenChange={state.setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📋 Histórico de Atividades</DialogTitle>
          </DialogHeader>
          <ActivityHistory taskId={state.selectedTaskForHistory} />
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        open={showImportPreview}
        onOpenChange={setShowImportPreview}
        validationResult={importValidation}
        mergeResult={importMerge}
        fileName={importFileName}
        onConfirmImport={handleConfirmImport}
        isImporting={isImporting}
      />

      {/* Quick Task Modal (Ctrl+N) */}
      <TaskModal
        open={state.showQuickTaskModal}
        onOpenChange={state.setShowQuickTaskModal}
        onSave={async (taskData) => {
          if (!taskData.column_id || !taskData.category_id) {
            toast({
              title: "Erro",
              description: "Selecione uma categoria e coluna",
              variant: "destructive"
            });
            return;
          }
          await state.addTask(taskData);
          toast({
            title: "Tarefa criada",
            description: "Sua tarefa foi adicionada com sucesso"
          });
        }}
        columnId={state.columns[0]?.id || ""}
        categoryId={state.selectedCategory || state.categories.find(c => c.name !== "Diário")?.id || ""}
        columns={state.columns}
      />

      {/* Daily Review Modal */}
      <DailyReviewModal
        open={showDailyReview}
        onOpenChange={setShowDailyReview}
        tasks={state.allTasks}
      />
    </div>
  );
}

export default Index;
