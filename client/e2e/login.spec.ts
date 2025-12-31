import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/JANDALISYS/);
    await expect(page.getByRole('heading', { name: /Login/i })).toBeVisible();
  });

  test('should fail with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message - adjusting for potential translation placeholders
    // We check for the Alert component which contains the error
    await expect(page.locator('.MuiAlert-message')).toBeVisible({ timeout: 10000 });
  });
});
