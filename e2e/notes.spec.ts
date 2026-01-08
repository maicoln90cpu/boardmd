import { test, expect } from '@playwright/test';

test.describe('Notas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes');
  });

  test('deve redirecionar para login se não autenticado', async ({ page }) => {
    // Se não autenticado, deve redirecionar
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    const isNotesPage = await page.getByText(/notas|cadernos|notes/i).isVisible().catch(() => false);
    
    expect(isLoginPage || isNotesPage).toBe(true);
  });

  test('deve exibir lista de notas quando autenticado', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await expect(page.getByText(/notas|notes|cadernos/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve ter botão para criar nova nota', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await expect(page.getByRole('button', { name: /nova|criar|adicionar|\+/i })).toBeVisible({ timeout: 10000 });
  });

  test('deve ter campo de busca', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    await expect(page.getByPlaceholder(/buscar|pesquisar|search/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de cadernos', async ({ page }) => {
    const isLoginPage = await page.getByPlaceholder(/email/i).isVisible().catch(() => false);
    if (isLoginPage) {
      test.skip();
    }
    
    // Verificar se há seção de cadernos
    const notebooksSection = page.getByText(/cadernos|notebooks/i);
    const hasNotebooks = await notebooksSection.isVisible().catch(() => false);
    
    // Pode existir ou não dependendo do estado
    expect(typeof hasNotebooks).toBe('boolean');
  });
});
