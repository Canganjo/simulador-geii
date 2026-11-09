import { defineConfig } from 'vitest/config'

// Testes unitários (Vitest). Os testes E2E (Playwright) ficam em tests/e2e
// e correm com "pnpm test:e2e", não aqui.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    passWithNoTests: true,
  },
})
