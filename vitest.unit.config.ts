import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/unit/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'examples/', '**/*.config.ts', '**/*.d.ts', 'tests/'],
        },
        // Fast timeouts for unit tests (no network calls)
        testTimeout: 5000,
        hookTimeout: 5000,
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
