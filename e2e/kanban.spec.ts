import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve exibir colunas do Kanban', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    // Verificar se existem colunas típicas de Kanban
    const columns = page.locator('[data-testid="kanban-column"], [class*="column"], [class*="Column"]');
    await expect(columns.first()).toBeVisible({ timeout: 10000 });
  });

  test('deve ter navegação entre views', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    // Verificar navegação (Diário, Projetos, etc.)
    await expect(page.getByText(/diário|daily|hoje/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir filtros quando disponíveis', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    // Verificar se há opções de filtro
    const filterButton = page.getByRole('button', { name: /filtro|filter/i });
    const hasFilter = await filterButton.isVisible().catch(() => false);
    
    if (hasFilter) {
      await filterButton.click();
      await expect(page.getByText(/prioridade|categoria|tag/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('cards de tarefa devem ter informações básicas', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    // Se houver tarefas, verificar estrutura do card
    const taskCard = page.locator('[data-testid="task-card"], [class*="TaskCard"], [class*="task-card"]').first();
    const hasCards = await taskCard.isVisible().catch(() => false);
    
    if (hasCards) {
      // Card deve ter título visível
      await expect(taskCard.locator('text=/./').first()).toBeVisible();
    }
  });
});
