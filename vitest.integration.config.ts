import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.integration.ts'],
        include: ['tests/integration/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'examples/', '**/*.config.ts', '**/*.d.ts', 'tests/'],
        },
        // Longer timeouts for integration tests (network calls)
        testTimeout: 30000, // 30 seconds
        hookTimeout: 30000,
        // Run integration tests sequentially to avoid RPC rate limits
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
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
