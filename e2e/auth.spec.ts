import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/');
    
    // Deve redirecionar para login ou exibir formulário
    await expect(page.getByRole('heading', { name: /login|entrar|bem-vindo/i })).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir campos de email e senha', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/senha|password/i)).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/');
    
    await page.getByPlaceholder(/email/i).fill('invalido@teste.com');
    await page.getByPlaceholder(/senha|password/i).fill('senhaerrada123');
    
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();
    
    // Aguardar mensagem de erro (toast ou inline)
    await expect(page.getByText(/inválid|incorret|erro|invalid|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve ter link para recuperação de senha', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText(/esquec|forgot|recuperar/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve ter opção de criar conta', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText(/criar conta|cadastr|registr|sign up/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve navegar para página de cadastro', async ({ page }) => {
    await page.goto('/');
    
    await page.getByText(/criar conta|cadastr|registr|sign up/i).first().click();
    
    // Deve exibir formulário de cadastro
    await expect(page.getByRole('heading', { name: /cadastr|criar|registr|sign up/i })).toBeVisible({ timeout: 10000 });
  });
});
