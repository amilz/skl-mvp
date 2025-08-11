/**
 * Tests for the Logger utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '../../../src/helpers/logger';

describe('Logger', () => {
    beforeEach(() => {
        // Reset logger to default state
        logger.configure({ level: LogLevel.WARN, prefix: '[KitLite]' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('configuration', () => {
        it('should configure log level', () => {
            logger.configure({ level: LogLevel.DEBUG });

            const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
            logger.debug('test message');

            expect(consoleSpy).toHaveBeenCalledWith('[KitLite] [DEBUG] test message');
        });

        it('should configure custom prefix', () => {
            logger.configure({ prefix: '[TestSDK]' });

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            logger.warn('test message');

            expect(consoleSpy).toHaveBeenCalledWith('[TestSDK] [WARN] test message');
        });
    });

    describe('log levels', () => {
        it('should respect log level filtering', () => {
            logger.configure({ level: LogLevel.ERROR });

            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            logger.debug('debug message');
            logger.warn('warn message');
            logger.error('error message');

            expect(debugSpy).not.toHaveBeenCalled();
            expect(warnSpy).not.toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should be silent when level is SILENT', () => {
            logger.configure({ level: LogLevel.SILENT });

            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logger.error('error message');

            expect(errorSpy).not.toHaveBeenCalled();
        });
    });
});
