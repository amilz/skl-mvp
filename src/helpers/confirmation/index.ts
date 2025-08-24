import type { Signature, Commitment } from '@solana/kit';
import type { Connection } from '@/connection';
import { safeJsonStringifyBigInt } from '../utils';
import { logger } from '../logger';

// Re-export account readiness utilities
export * from './account-readiness';

/**
 * Configuration for transaction confirmation
 */
export interface ConfirmationConfig {
    /** Maximum time to wait for confirmation in milliseconds */
    timeout?: number;
    /** Polling interval in milliseconds */
    pollInterval?: number;
    /** Target commitment level */
    commitment?: Commitment;
    /** Maximum valid block height for the transaction */
    maxValidBlockHeight?: number;
    /** Skip block height checking */
    skipBlockHeightCheck?: boolean;
}

/**
 * Status of a confirmation attempt
 */
export type ConfirmationStatus =
    | { type: 'confirmed'; commitment: Commitment }
    | { type: 'failed'; error: unknown }
    | { type: 'timeout' }
    | { type: 'blockhash_expired' };

/**
 * Result of a confirmation attempt
 */
export interface ConfirmationResult {
    signature: Signature;
    status: ConfirmationStatus;
    elapsedMs: number;
}

/**
 * Creates a promise that resolves when the transaction is confirmed
 */
function createSignatureConfirmationPromise(
    connection: Connection,
    signature: Signature,
    commitment: Commitment,
    pollInterval: number,
    signal?: AbortSignal,
): Promise<ConfirmationStatus> {
    return new Promise((resolve, reject) => {
        let intervalId: NodeJS.Timeout;

        const cleanup = () => {
            if (intervalId) clearInterval(intervalId);
        };

        // Handle abort signal
        if (signal) {
            signal.addEventListener('abort', () => {
                cleanup();
                reject(new Error('Confirmation aborted'));
            });
        }

        const checkStatus = async () => {
            try {
                const response = await connection.getSignatureStatuses([signature]);
                const status = response[0];

                if (!status) {
                    // Transaction not found yet, continue polling
                    return;
                }

                // Check for error
                if (status.err) {
                    cleanup();
                    resolve({ type: 'failed', error: status.err });
                    return;
                }

                // Check if reached target commitment
                if (status.confirmationStatus && hasReachedCommitment(status.confirmationStatus, commitment)) {
                    cleanup();
                    resolve({ type: 'confirmed', commitment: status.confirmationStatus });
                    return;
                }
            } catch (error) {
                // Network errors - continue polling
                logger.debug('Error checking signature status:', error);
            }
        };

        // Start polling
        checkStatus(); // Check immediately
        intervalId = setInterval(checkStatus, pollInterval);
    });
}

/**
 * Creates a promise that rejects when block height exceeds the transaction's validity
 */
function createBlockHeightExceedencePromise(
    connection: Connection,
    maxValidBlockHeight: number,
    pollInterval: number,
    signal?: AbortSignal,
): Promise<ConfirmationStatus> {
    return new Promise((resolve, reject) => {
        let intervalId: NodeJS.Timeout;

        const cleanup = () => {
            if (intervalId) clearInterval(intervalId);
        };

        // Handle abort signal
        if (signal) {
            signal.addEventListener('abort', () => {
                cleanup();
                reject(new Error('Block height monitoring aborted'));
            });
        }

        const checkBlockHeight = async () => {
            try {
                const currentBlockHeight = await connection.getBlockHeight();

                if (currentBlockHeight > maxValidBlockHeight) {
                    cleanup();
                    resolve({ type: 'blockhash_expired' });
                    return;
                }
            } catch (error) {
                // Network errors - continue polling
                logger.debug('Error checking block height:', error);
            }
        };

        // Start polling
        checkBlockHeight(); // Check immediately
        intervalId = setInterval(checkBlockHeight, pollInterval);
    });
}

/**
 * Creates a promise that rejects after a timeout
 */
function createTimeoutPromise(timeoutMs: number, signal?: AbortSignal): Promise<ConfirmationStatus> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            resolve({ type: 'timeout' });
        }, timeoutMs);

        // Handle abort signal
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new Error('Timeout aborted'));
            });
        }
    });
}

/**
 * Check if current commitment level meets or exceeds target commitment
 */
function hasReachedCommitment(current: Commitment, target: Commitment): boolean {
    const commitmentLevels = {
        processed: 0,
        confirmed: 1,
        finalized: 2,
    };

    const currentLevel = commitmentLevels[current];
    const targetLevel = commitmentLevels[target];

    return currentLevel !== undefined && targetLevel !== undefined && currentLevel >= targetLevel;
}

/**
 * Races multiple confirmation strategies and returns the first to complete
 */
async function raceConfirmationStrategies(strategies: Promise<ConfirmationStatus>[]): Promise<ConfirmationStatus> {
    try {
        // Race all strategies - first to resolve/reject wins
        return await Promise.race(strategies);
    } catch (error) {
        // If all strategies throw errors, return a generic failure
        return { type: 'failed', error };
    }
}

/**
 * Wait for a transaction to be confirmed using racing strategies
 *
 * This implementation is inspired by @solana/transaction-confirmation but simplified
 * for Kit Lite's needs. It races multiple strategies:
 * 1. Signature confirmation (success path)
 * 2. Block height exceedence (failure path if blockhash expires)
 * 3. Timeout (failure path if taking too long)
 *
 * @param connection - The connection to use for RPC calls
 * @param signature - The transaction signature to confirm
 * @param config - Configuration options
 * @returns Promise that resolves with confirmation result
 */
export async function waitForTransactionConfirmation(
    connection: Connection,
    signature: Signature,
    config: ConfirmationConfig = {},
): Promise<ConfirmationResult> {
    const {
        timeout = 30000,
        pollInterval = 500,
        commitment = 'confirmed',
        maxValidBlockHeight,
        skipBlockHeightCheck = false,
    } = config;

    const startTime = Date.now();
    const abortController = new AbortController();

    try {
        // Build array of racing strategies
        const strategies: Promise<ConfirmationStatus>[] = [];

        // Primary strategy: wait for signature confirmation
        strategies.push(
            createSignatureConfirmationPromise(connection, signature, commitment, pollInterval, abortController.signal),
        );

        // Add block height monitoring if applicable
        if (!skipBlockHeightCheck && maxValidBlockHeight) {
            strategies.push(
                createBlockHeightExceedencePromise(
                    connection,
                    maxValidBlockHeight,
                    pollInterval,
                    abortController.signal,
                ),
            );
        }

        // Always add timeout strategy
        strategies.push(createTimeoutPromise(timeout, abortController.signal));

        // Race all strategies
        const status = await raceConfirmationStrategies(strategies);

        // Cancel other strategies once one completes
        abortController.abort();

        return {
            signature,
            status,
            elapsedMs: Date.now() - startTime,
        };
    } catch (error) {
        // Ensure cleanup
        abortController.abort();

        return {
            signature,
            status: { type: 'failed', error },
            elapsedMs: Date.now() - startTime,
        };
    }
}

/**
 * Helper function to throw appropriate errors based on confirmation status
 */
export function throwOnFailedConfirmation(result: ConfirmationResult): void {
    switch (result.status.type) {
        case 'confirmed':
            // Success - no error
            return;
        case 'failed':
            throw new Error(`Transaction failed: ${safeJsonStringifyBigInt(result.status.error)}`);
        case 'timeout':
            throw new Error(`Transaction confirmation timeout after ${result.elapsedMs}ms`);
        case 'blockhash_expired':
            throw new Error(`Transaction blockhash expired before confirmation`);
        default:
            throw new Error(`Unknown confirmation status: ${safeJsonStringifyBigInt(result.status)}`);
    }
}

/**
 * Convenience function to wait for confirmation and throw on failure
 */
export async function confirmTransaction(
    connection: Connection,
    signature: Signature,
    config: ConfirmationConfig = {},
): Promise<void> {
    const result = await waitForTransactionConfirmation(connection, signature, config);
    throwOnFailedConfirmation(result);
}
