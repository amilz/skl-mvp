/**
 * Tests for the Connection class
 */
import { describe, it, expect } from 'vitest';
import { Connection } from '../../../src/connection';

describe('Connection', () => {
    describe('constructor', () => {
        it('should create a connection instance', () => {
            const endpoint = 'https://api.devnet.solana.com';
            const connection = new Connection(endpoint);

            expect(connection).toBeInstanceOf(Connection);
            expect(connection.raw).toBeDefined();
        });

        it('should provide raw RPC access', () => {
            const endpoint = 'https://api.devnet.solana.com';
            const connection = new Connection(endpoint);

            // Raw should have RPC methods that require .send()
            expect(connection.raw.getLatestBlockhash).toBeDefined();
            expect(connection.raw.getBalance).toBeDefined();
        });
    });
});
