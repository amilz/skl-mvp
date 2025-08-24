import {
    createKeyPairSignerFromBytes,
    generateKeyPairSigner,
    getBase58Encoder,
    type KeyPairSigner,
    type ReadonlyUint8Array,
} from '@solana/kit';

/**
 * Generates a new random keypair.
 *
 * @returns Promise resolving to a new KeyPairSigner
 * @example
 * ```typescript
 * const keypair = await generateKeypair();
 * console.log(keypair.address); // The public key address
 * ```
 */
export async function generateKeypair(): Promise<KeyPairSigner> {
    return await generateKeyPairSigner();
}

/**
 * Creates a keypair from a 64-byte secret key (32-byte private key + 32-byte public key).
 * This is the format typically used in Solana wallet files.
 *
 * @param secretKey - 64-byte secret key as Uint8Array or number array
 * @returns Promise resolving to a KeyPairSigner
 * @throws Error if secretKey is not exactly 64 bytes
 * @example
 * ```typescript
 * const secretKey = new Uint8Array(64); // Your 64-byte secret key
 * const keypair = await createKeypairFromSecretKey(secretKey);
 * ```
 */
export async function createKeypairFromSecretKey(secretKey: Uint8Array | number[] | ReadonlyUint8Array): Promise<KeyPairSigner> {
    if (secretKey.length !== 64) {
        throw new Error(`Secret key must be exactly 64 bytes, got ${secretKey.length} bytes`);
    }

    const bytes = secretKey instanceof Uint8Array ? secretKey : new Uint8Array(secretKey);
    return await createKeyPairSignerFromBytes(bytes);
}

/**
 * Creates a keypair from a base58-encoded secret key string.
 * This format is commonly used in Solana CLI and some wallets.
 *
 * @param base58String - Base58-encoded secret key string
 * @returns Promise resolving to a KeyPairSigner
 * @throws Error if the base58 string is invalid or doesn't decode to 64 bytes
 * @example
 * ```typescript
 * const base58Key = "your-base58-encoded-secret-key";
 * const keypair = await createKeypairFromBase58(base58Key);
 * ```
 */
export async function createKeypairFromBase58(base58String: string): Promise<KeyPairSigner> {
    if (!base58String || typeof base58String !== 'string') {
        throw new Error('Base58 string must be a non-empty string');
    }

    try {
        const secretKey = getBase58Encoder().encode(base58String);
        return await createKeypairFromSecretKey(secretKey);
    } catch (error) {
        if (error instanceof Error && error.message.includes('64 bytes')) {
            throw error; // Re-throw our own validation error
        }
        throw new Error(`Invalid base58 string: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Utility object for creating and managing Solana keypairs.
 * Provides factory functions for different keypair creation scenarios.
 * 
 * @deprecated Use the individual factory functions instead: generateKeypair, createKeypairFromSecretKey, createKeypairFromBase58
 */
export const Keypair = {
    generate: generateKeypair,
    fromSecretKey: createKeypairFromSecretKey,
    fromBase58: createKeypairFromBase58,
};
