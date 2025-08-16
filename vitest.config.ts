import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@stripemeter/core': path.resolve(__dirname, './packages/core/src'),
      '@stripemeter/database': path.resolve(__dirname, './packages/database/src'),
      '@stripemeter/pricing-lib': path.resolve(__dirname, './packages/pricing-lib/src'),
      '@stripemeter/sdk-node': path.resolve(__dirname, './packages/sdk-node/src'),
    },
  },
});
