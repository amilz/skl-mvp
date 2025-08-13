import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            name: 'KitLiteDemo',
            fileName: 'kit-lite-demo',
            formats: ['es'],
        },
        rollupOptions: {
            external: [],
            output: {
                manualChunks: undefined,
            },
        },
        minify: 'terser',
        reportCompressedSize: true,
    },
    resolve: {
        alias: {
            'kit-lite': resolve(__dirname, '../../src/index.ts'),
            '@': resolve(__dirname, '../../src'),
        },
    },
});
