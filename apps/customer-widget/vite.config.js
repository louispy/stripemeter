import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@stripemeter/core': path.resolve(__dirname, '../../packages/core/src'),
        },
    },
    server: {
        port: 3002,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        lib: {
            entry: path.resolve(__dirname, 'src/widget.tsx'),
            name: 'StripemeterWidget',
            fileName: (format) => `stripemeter-widget.${format}.js`,
            formats: ['umd', 'es'],
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map