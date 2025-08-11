/**
 * Global test setup for Vitest
 *
 * This file runs once before all tests and sets up global configurations.
 */

import { beforeAll } from 'vitest';
import { logger, LogLevel } from '../src/helpers/logger';

beforeAll(() => {
    // Silence logger during tests unless explicitly testing logging
    logger.configure({ level: LogLevel.SILENT });

    // Set test environment variables
    process.env.NODE_ENV = 'test';
});
