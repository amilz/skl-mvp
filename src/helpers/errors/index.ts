import { isSolanaError, type SolanaError } from '@solana/kit';

export type KitLiteError = {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    originalError?: unknown;
};

/**
 * Handles Solana-specific errors and maps them to friendly messages
 */
function handleSolanaError(error: SolanaError): KitLiteError {
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

/**
 * Handles any type of error and converts it to a standardized KitLiteError format
 *
 * @param error - The error to handle
 * @returns A standardized KitLiteError object
 * @example
 * ```typescript
 * const handledError = handleError(someError);
 * console.log(handledError.message);
 * ```
 */
export function handleError(error: unknown): KitLiteError {
    // Handle Solana-specific errors
    if (isSolanaError(error)) {
        return handleSolanaError(error);
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

/**
 * Checks if an error indicates insufficient funds
 *
 * @param error - The error to check
 * @returns True if the error indicates insufficient funds
 * @example
 * ```typescript
 * if (isInsufficientFunds(error)) {
 *     console.log('User needs more SOL');
 * }
 * ```
 */
export function isInsufficientFunds(error: unknown): boolean {
    const handled = handleError(error);
    return handled.code === 'SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS';
}

/**
 * Checks if an error indicates a network issue
 *
 * @param error - The error to check
 * @returns True if the error indicates a network issue
 * @example
 * ```typescript
 * if (isNetworkError(error)) {
 *     console.log('Network connection problem');
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
    const handled = handleError(error);
    return handled.code?.includes('TRANSPORT') || handled.code?.includes('NETWORK');
}

/**
 * Checks if an error indicates a transaction has expired
 *
 * @param error - The error to check
 * @returns True if the error indicates a transaction has expired
 * @example
 * ```typescript
 * if (isTransactionExpired(error)) {
 *     console.log('Transaction expired, need new blockhash');
 * }
 * ```
 */
export function isTransactionExpired(error: unknown): boolean {
    const handled = handleError(error);
    return handled.code === 'SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND';
}

/**
 * Wraps an async function with error handling
 *
 * @param fn - The async function to wrap
 * @param options - Optional configuration for retry behavior and error handling
 * @returns A wrapped version of the function with error handling
 * @example
 * ```typescript
 * const safeFunction = withErrorHandling(async () => {
 *     // Your async code here
 * }, { retry: 3, onError: console.error });
 * ```
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
                lastError = handleError(error);

                if (options?.onError) {
                    options.onError(lastError);
                }

                // Don't retry if it's the last attempt
                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        // This should never be reached, but TypeScript requires it
        throw lastError;
    }) as T;
}

/**
 * Utility object for error handling operations.
 * Provides functions for different error handling scenarios.
 * 
 * @deprecated Use the individual functions instead: handleError, isInsufficientFunds, isNetworkError, isTransactionExpired
 */
export const KitLiteErrorHandler = {
    handle: handleError,
    isInsufficientFunds,
    isNetworkError,
    isTransactionExpired,
};
