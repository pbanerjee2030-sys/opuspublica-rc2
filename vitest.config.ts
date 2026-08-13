import { defineConfig } from 'vitest/config';

// Vitest configuration for Opus Publica RC2.
// Sequential execution required for governance DB integration tests
// (per wp-gov-01c-ext-regression-reconciliation.md §6).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    slowTestThreshold: 5000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    include: [
      'tests/**/*.test.ts',
      'governance/workers/__tests__/**/*.test.ts',
    ],
    exclude: [
      'lib/opce/__tests__/**',
      'node_modules/**',
    ],
  },
});
