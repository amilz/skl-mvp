/**
 * Logger utility for Kit Lite SDK
 *
 * Provides a centralized logging interface that can be configured
 * or disabled based on environment or user preferences.
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

export interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
}

class Logger {
    private level: LogLevel = LogLevel.WARN;
    private prefix: string = '[KitLite]';

    /**
     * Configure the logger
     */
    configure(config: Partial<LoggerConfig>) {
        if (config.level !== undefined) {
            this.level = config.level;
        }
        if (config.prefix !== undefined) {
            this.prefix = config.prefix;
        }
    }

    /**
     * Set log level from environment variable
     */
    setLevelFromEnv() {
        const envLevel = process.env.KITLITE_LOG_LEVEL?.toUpperCase();
        if (envLevel && envLevel in LogLevel) {
            this.level = LogLevel[envLevel as keyof typeof LogLevel];
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.level;
    }

    private formatMessage(level: string, message: string): string {
        return `${this.prefix} [${level}] ${message}`;
    }

    debug(message: string, ...args: unknown[]) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }

    info(message: string, ...args: unknown[]) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage('INFO', message), ...args);
        }
    }

    warn(message: string, ...args: unknown[]) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }

    error(message: string, ...args: unknown[]) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }
}

// Singleton instance
export const logger = new Logger();

// Initialize from environment on module load
if (typeof process !== 'undefined' && process.env) {
    logger.setLevelFromEnv();
}

// Export for convenience
export default logger;
