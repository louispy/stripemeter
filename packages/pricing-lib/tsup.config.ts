import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Will use tsc for declarations
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
