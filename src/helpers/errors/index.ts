import { isSolanaError, type SolanaError } from '@solana/kit';

export type KitLiteError = {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    originalError?: unknown;
};

export class KitLiteErrorHandler {
    static handle(error: unknown): KitLiteError {
        // Handle Solana-specific errors
        if (isSolanaError(error)) {
            return this.handleSolanaError(error);
        }

        // Handle standard errors
        if (error instanceof Error) {
            return {
                code: 'UNKNOWN_ERROR',
                message: error.message,
                originalError: error,
            };
        }

        // Handle unknown errors
        return {
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred',
            originalError: error,
        };
    }

    private static handleSolanaError(error: SolanaError): KitLiteError {
        // Map common Solana errors to friendly messages
        const errorMap: Record<string, string> = {
            SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR: 'Network connection failed. Please check your RPC endpoint.',
            SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND:
                'Transaction expired. Please retry with a fresh blockhash.',
            SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS: 'Insufficient SOL balance for transaction.',
            SOLANA_ERROR__TRANSACTION_ERROR__INVALID_ACCOUNT_DATA: 'Invalid account data. Account may not exist.',
            SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND: 'Account not found on the network.',
        };

        const errorCode = String(error.context.__code);
        const friendlyMessage = errorMap[errorCode] || error.message;

        return {
            code: errorCode,
            message: friendlyMessage,
            details: error.context,
            originalError: error,
        };
    }

    static isInsufficientFunds(error: unknown): boolean {
        const handled = this.handle(error);
        return handled.code === 'SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS';
    }

    static isNetworkError(error: unknown): boolean {
        const handled = this.handle(error);
        return handled.code?.includes('TRANSPORT') || handled.code?.includes('NETWORK');
    }

    static isTransactionExpired(error: unknown): boolean {
        const handled = this.handle(error);
        return handled.code === 'SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND';
    }
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
        retry?: number;
        retryDelay?: number;
        onError?: (error: KitLiteError) => void;
    },
): T {
    return (async (...args: Parameters<T>) => {
        let lastError: KitLiteError | undefined;
        const maxRetries = options?.retry ?? 0;
        const retryDelay = options?.retryDelay ?? 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = KitLiteErrorHandler.handle(error);

                if (options?.onError) {
                    options.onError(lastError);
                }

                // Don't retry if it's the last attempt
                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Don't retry certain errors
                if (KitLiteErrorHandler.isInsufficientFunds(error)) {
                    throw lastError;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            }
        }

        throw lastError;
    }) as T;
}
