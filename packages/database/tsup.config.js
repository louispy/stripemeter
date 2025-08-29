import { defineConfig } from 'tsup';
export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['postgres', 'ioredis', 'drizzle-orm'],
});
//# sourceMappingURL=tsup.config.js.map