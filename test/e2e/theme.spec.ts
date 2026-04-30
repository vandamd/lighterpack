import { test, expect } from '@playwright/test';

import { registerUser } from './auth-utils';

test.describe('Theme mode', () => {
  test('cycles and persists as a per-browser preference', async ({ page }) => {
    const now = Date.now();
    const username = `theme${now}`;
    const email = `theme+${now}@lighterpack.com`;
    const password = 'testtest';

    await registerUser(page, username, password, email);

    await page.getByText('Share', { exact: true }).hover();
    const shareUrlLocator = page.getByLabel('Share your list');
    await expect(shareUrlLocator).toHaveValue(/\S/);
    const shareUrl = await shareUrlLocator.inputValue();

    const themeButton = page.getByRole('button', { name: 'Auto Theme' });
    await expect(themeButton).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'auto');

    await themeButton.click();
    await expect(page.getByRole('button', { name: 'Dark Theme' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Dark Theme' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark');
    const storedTheme = await page.evaluate(() => localStorage.getItem('themeMode'));
    expect(storedTheme).toBe('dark');

    const storedLibrary = await page.evaluate(() => localStorage.getItem('library') || '');
    expect(storedLibrary).not.toContain('themeMode');

    await page.getByRole('button', { name: 'Dark Theme' }).click();
    await expect(page.getByRole('button', { name: 'Light Theme' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light');

    await page.getByRole('button', { name: 'Light Theme' }).click();
    await expect(page.getByRole('button', { name: 'Auto Theme' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'auto');

    await page.evaluate(() => localStorage.setItem('themeMode', 'dark'));
    await page.goto(shareUrl);
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.evaluate(() => localStorage.setItem('themeMode', 'light'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
