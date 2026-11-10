import { defineConfig, devices } from '@playwright/test'

// Testes E2E: o Playwright abre um browser verdadeiro e usa a app
// como um utilizador (clicar, arrastar, simular).
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // A app escolhe a língua do browser na 1.ª visita: os testes correm em português.
    locale: 'pt-PT',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Faz o build e serve a versão de produção antes dos testes.
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
