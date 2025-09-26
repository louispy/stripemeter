import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  clean: true,
  format: ['cjs', 'esm'],
  target: 'node20',
  dts: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});


