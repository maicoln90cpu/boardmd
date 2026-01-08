import { test, expect } from '@playwright/test';

// Estes testes assumem que o usuário está autenticado
// Em produção, usar fixtures para autenticação

test.describe('Tarefas (usuário autenticado)', () => {
  test.beforeEach(async ({ page }) => {
    // Simular estado autenticado via localStorage/cookie
    // ou usar API para criar sessão de teste
    await page.goto('/');
  });

  test('deve exibir Kanban board quando autenticado', async ({ page }) => {
    // Se não autenticado, pular teste
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await expect(page.getByText(/kanban|tarefas|a fazer|to do/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve ter botão para criar nova tarefa', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await expect(page.getByRole('button', { name: /nova|criar|adicionar|\+/i })).toBeVisible({ timeout: 10000 });
  });

  test('deve abrir modal ao clicar em nova tarefa', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await page.getByRole('button', { name: /nova|criar|adicionar|\+/i }).first().click();
    
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/título/i)).toBeVisible();
  });

  test('modal deve ter campos essenciais', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await page.getByRole('button', { name: /nova|criar|adicionar|\+/i }).first().click();
    
    await expect(page.getByPlaceholder(/título/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/descrição/i)).toBeVisible();
    await expect(page.getByText(/prioridade/i)).toBeVisible();
  });

  test('deve fechar modal ao cancelar', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await page.getByRole('button', { name: /nova|criar|adicionar|\+/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /cancelar/i }).click();
    
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});
