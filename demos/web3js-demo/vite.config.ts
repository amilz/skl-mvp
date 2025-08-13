import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            name: 'Web3JS',
            fileName: 'web3js-demo',
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
});
