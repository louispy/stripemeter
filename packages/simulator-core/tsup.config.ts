import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  clean: true,
  format: ['cjs', 'esm'],
  target: 'es2022',
});


