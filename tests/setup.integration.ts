/**
 * Integration test setup for Vitest
 *
 * This file sets up the environment for integration tests that make real RPC calls.
 */

import { beforeAll } from 'vitest';
import { logger, LogLevel } from '../src/helpers/logger';

// Default to local validator for integration tests
export const TEST_RPC_ENDPOINT = process.env.TEST_RPC_ENDPOINT || 'http://127.0.0.1:8899';

beforeAll(() => {
    // Enable logging for integration tests to debug network issues
    const logLevel = process.env.TEST_LOG_LEVEL
        ? LogLevel[process.env.TEST_LOG_LEVEL as keyof typeof LogLevel]
        : LogLevel.WARN;

    logger.configure({ level: logLevel });

    // Set test environment
    process.env.NODE_ENV = 'test';

    console.log(`Integration tests using RPC endpoint: ${TEST_RPC_ENDPOINT}`);
    console.log('Note: Integration tests require a running Solana test validator or devnet access');
});
