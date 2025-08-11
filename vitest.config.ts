import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'examples/', '**/*.config.ts', '**/*.d.ts', 'tests/'],
        },
        testTimeout: 30000, // 30 seconds for RPC calls
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/helpers': path.resolve(__dirname, './src/helpers'),
            '@/connection': path.resolve(__dirname, './src/connection'),
        },
    },
});
