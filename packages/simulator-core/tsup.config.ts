import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: false, // generate .d.ts via tsc in build script
  splitting: false,
  clean: true,
  format: ['cjs', 'esm'],
  target: 'es2022',
});


