import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

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
    setupFiles: [path.resolve(rootDir, './test/setup.ts')],
  },
  resolve: {
    alias: {
      '@stripemeter/core': path.resolve(rootDir, './packages/core/src'),
      '@stripemeter/database': path.resolve(rootDir, './packages/database/src'),
      '@stripemeter/pricing-lib': path.resolve(rootDir, './packages/pricing-lib/src'),
      '@stripemeter/sdk-node': path.resolve(rootDir, './packages/sdk-node/src'),
    },
  },
});
