/**
 * Integration tests for Connection class
 *
 * These tests make real RPC calls and require either:
 * - A local Solana test validator running on http://127.0.0.1:8899
 * - Access to devnet/testnet (set TEST_RPC_ENDPOINT env var)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Connection } from '../../src/connection';
import { TEST_RPC_ENDPOINT } from '../setup.integration';

describe('Connection Integration Tests', () => {
    let connection: Connection;

    beforeAll(() => {
        connection = new Connection(TEST_RPC_ENDPOINT);
    });

    describe('getLatestBlockhash', () => {
        it('should fetch real blockhash from network', async () => {
            const response = await connection.getLatestBlockhash();

            expect(response.value.blockhash).toBeDefined();
            expect(typeof response.value.blockhash).toBe('string');
            expect(response.value.lastValidBlockHeight).toBeDefined();
            expect(typeof response.value.lastValidBlockHeight).toBe('bigint');
            expect(response.context.slot).toBeGreaterThan(0);
        }, 10000); // 10 second timeout for network call
    });

    describe('getBlockHeight', () => {
        it('should fetch current block height', async () => {
            const blockHeight = await connection.getBlockHeight();

            expect(typeof blockHeight).toBe('number');
            expect(blockHeight).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getSlot', () => {
        it('should fetch current slot', async () => {
            const slot = await connection.getSlot();

            expect(typeof slot).toBe('number');
            expect(slot).toBeGreaterThan(0);
        });
    });

    // TODO: Add more integration tests for:
    // - getBalance with real addresses
    // - getAccountInfo with known program accounts
    // - simulateTransaction with real transactions
    // - airdrop functionality (devnet only)
    // - sendAndConfirm with real transactions
});
