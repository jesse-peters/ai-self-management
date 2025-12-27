import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
        setupFiles: ['./src/__tests__/setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@projectflow/core': path.resolve(__dirname, '../../packages/core/src'),
            '@projectflow/db': path.resolve(__dirname, '../../packages/db/src'),
        },
    },
});


