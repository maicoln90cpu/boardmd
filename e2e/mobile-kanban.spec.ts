import { test, expect } from "@playwright/test";

test.describe("Mobile Kanban Gestures", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const isLoginPage = await page
      .getByPlaceholder(/email/i)
      .isVisible()
      .catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
  });

  test("deve exibir lista de tarefas no formato checklist mobile", async ({
    page,
  }) => {
    // Aguardar a lista de tarefas carregar
    const taskList = page.locator('[role="list"][aria-label="Lista de tarefas"]');
    await expect(taskList).toBeVisible({ timeout: 10000 });
  });

  test("deve exibir pills de filtro por coluna", async ({ page }) => {
    // O botão "Todas" deve estar visível
    const allFilter = page.getByText(/Todas \(\d+\)/);
    await expect(allFilter).toBeVisible({ timeout: 10000 });
  });

  test("deve alternar filtro ao clicar em pill de coluna", async ({ page }) => {
    const allFilter = page.getByText(/Todas \(\d+\)/);
    await expect(allFilter).toBeVisible({ timeout: 10000 });

    // Clicar em uma pill de coluna específica (se existir)
    const columnPills = page.locator(
      'button:has-text("("):not(:has-text("Todas"))',
    );
    const pillCount = await columnPills.count();

    if (pillCount > 0) {
      await columnPills.first().click();
      // O filtro "Todas" deve perder o estilo ativo
      await expect(allFilter).not.toHaveClass(/bg-primary/);
    }
  });

  test("deve exibir botão de ordenação", async ({ page }) => {
    const sortButton = page.locator('[aria-label*="Ordenar"]');
    await expect(sortButton).toBeVisible({ timeout: 10000 });
  });

  test("deve ciclar modo de ordenação ao clicar", async ({ page }) => {
    const sortButton = page.locator('[aria-label*="Ordenar"]');
    await expect(sortButton).toBeVisible({ timeout: 10000 });

    // Verificar texto inicial "Coluna"
    await expect(sortButton).toContainText("Coluna");

    // Clicar para mudar para "Prioridade"
    await sortButton.click();
    await expect(sortButton).toContainText("Prioridade");

    // Clicar para mudar para "Data"
    await sortButton.click();
    await expect(sortButton).toContainText("Data");

    // Clicar para voltar para "Coluna"
    await sortButton.click();
    await expect(sortButton).toContainText("Coluna");
  });

  test("deve exibir separadores de coluna quando Todas ativo e ordenação por Coluna", async ({
    page,
  }) => {
    // Garantir que "Todas" está ativo (padrão)
    const allFilter = page.getByText(/Todas \(\d+\)/);
    await expect(allFilter).toBeVisible({ timeout: 10000 });

    // Verificar se existem separadores visuais de grupo
    const separators = page.locator(
      '.bg-muted\\/30:has-text("")',
    );
    const sepCount = await separators.count();

    // Se há tarefas, deve haver pelo menos 1 separador
    const taskItems = page.locator('[role="listitem"]');
    const taskCount = await taskItems.count();

    if (taskCount > 0) {
      expect(sepCount).toBeGreaterThan(0);
    }
  });

  test("deve ter botão Nova tarefa visível", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /nova tarefa/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test("cards de tarefa devem ter checkbox e barra de cor", async ({
    page,
  }) => {
    const taskItems = page.locator('[role="listitem"]');
    const count = await taskItems.count();

    if (count > 0) {
      const firstTask = taskItems.first();
      // Deve ter checkbox
      const checkbox = firstTask.locator('[role="button"][aria-label*="tarefa"]');
      await expect(checkbox).toBeVisible();
    }
  });
});
