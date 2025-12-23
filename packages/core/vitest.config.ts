import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
  },
  resolve: {
    alias: {
      '@projectflow/db': path.resolve(__dirname, '../db/src'),
    },
  },
});

