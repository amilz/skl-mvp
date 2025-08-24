/**
 * Tests for the Connection class
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createConnection, type Connection } from '../../../src/connection';

describe('Connection', () => {
    let connection: Connection;
    const endpoint = 'https://api.devnet.solana.com';

    beforeEach(() => {
        connection = createConnection(endpoint);
    });

    it('should create a connection with the correct endpoint', () => {
        expect(connection).toBeDefined();
        expect(typeof connection.getBalance).toBe('function');
    });

    it('should have all required methods', () => {
        expect(connection.getLatestBlockhash).toBeDefined();
        expect(connection.getBalance).toBeDefined();
        expect(connection.getBlockHeight).toBeDefined();
        expect(connection.getSlot).toBeDefined();
        expect(connection.getAccountInfo).toBeDefined();
        expect(connection.sendTransaction).toBeDefined();
        expect(connection.simulateTransaction).toBeDefined();
        expect(connection.getSignatureStatuses).toBeDefined();
        expect(connection.getTransaction).toBeDefined();
        expect(connection.getMultipleAccounts).toBeDefined();
        expect(connection.requestAirdrop).toBeDefined();
        expect(connection.confirmTransaction).toBeDefined();
        expect(connection.waitForBalance).toBeDefined();
        expect(connection.airdropIfNeeded).toBeDefined();
        expect(connection.createTransaction).toBeDefined();
        expect(connection.raw).toBeDefined();
    });
});
