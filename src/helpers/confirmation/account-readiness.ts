import type { Connection } from '@/connection';
import type { Commitment } from '@solana/kit';

/**
 * Configuration for waiting for an account to be ready
 */
export interface AccountReadinessConfig {
    /** Maximum time to wait in milliseconds */
    timeout?: number;
    /** Polling interval in milliseconds */
    pollInterval?: number;
    /** Commitment level to check at */
    commitment?: Commitment;
}

/**
 * Waits for an account to exist and be queryable at the specified commitment level
 *
 * This is useful after airdrops or account creation to ensure the account
 * has propagated across the network before attempting operations on it.
 *
 * @param connection - The connection to use
 * @param address - The account address to check
 * @param config - Configuration options
 * @returns Promise that resolves when account is ready
 */
export async function waitForAccountReady(
    connection: Connection,
    address: string,
    config: AccountReadinessConfig = {},
): Promise<void> {
    const { timeout = 10000, pollInterval = 500, commitment = 'confirmed' } = config;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            // Try to get account info - if it succeeds, the account exists
            const accountInfo = await connection.getAccountInfo(address, { commitment });

            // Check if account exists (not null)
            if (accountInfo !== null) {
                return; // Account is ready
            }
        } catch (error) {
            // Account doesn't exist yet or network error - continue polling
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Account ${address} not ready after ${timeout}ms`);
}

/**
 * Waits for an account balance to be non-zero at the specified commitment level
 *
 * This is particularly useful after airdrops to ensure funds have arrived
 * and are queryable before attempting to use them.
 *
 * @param connection - The connection to use
 * @param address - The account address to check
 * @param minBalance - Minimum balance to wait for (default 1 lamport)
 * @param config - Configuration options
 * @returns Promise that resolves with the balance when ready
 */
export async function waitForBalance(
    connection: Connection,
    address: string,
    minBalance: number = 1,
    config: AccountReadinessConfig = {},
): Promise<number> {
    const { timeout = 10000, pollInterval = 500, commitment = 'confirmed' } = config;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const balance = await connection.getBalance(address, { commitment });

            if (balance >= minBalance) {
                return balance; // Balance is sufficient
            }
        } catch (error) {
            // Continue polling on error
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Account balance not ready after ${timeout}ms`);
}
