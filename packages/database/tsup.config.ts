import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Generate declarations
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['postgres', 'ioredis', 'drizzle-orm'],
});
