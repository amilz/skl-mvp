import {
    // Core RPC functionality
    createRpc,
    createJsonRpcApi,
    createDefaultRpcTransport,
    getSolanaErrorFromJsonRpcError,
    type Rpc,
    type RpcRequest,
    type RpcResponseTransformer,

    // Address and signature utilities
    assertIsAddress,
    assertIsSignature,
    type Address,
    type Signature,

    // Transaction types and utilities
    getBase64EncodedWireTransaction,
    type Transaction,

    // RPC API types
    type GetLatestBlockhashApi,
    type GetBalanceApi,
    type GetBlockHeightApi,
    type GetSlotApi,
    type GetAccountInfoApi,
    type SendTransactionApi,
    type GetSignatureStatusesApi,
    type SimulateTransactionApi,
    type GetTransactionApi,
    type GetMultipleAccountsApi,
    type RequestAirdropApi,

    // RPC response types
    type SolanaRpcResponse,
    type Commitment,
    type AccountInfoWithBase64EncodedData,
    lamports,
} from '@solana/kit';
import type {
    GetLatestBlockhashApiResponse,
    TransactionResponse,
    SendTransactionOptions,
    SendTransactionConfig,
    GetAccountInfoOptions,
    GetAccountInfoApiResponse,
    GetAccountInfoApiSliceableCommonConfig,
    GetAccountInfoApiCommonConfig,
    GetSignatureStatusesApiResponse,
    SimulateTransactionConfigBase,
    SimulateTransactionApiResponseBase,
    GetBalanceConfig,
    GetLatestBlockhashConfig,
} from '@/types';
import { confirmTransaction, waitForBalance, type ConfirmationConfig } from '@/helpers/confirmation';
import { logger } from '@/helpers/logger';

// Phase 1 RPC API methods
type KitLiteApi = GetLatestBlockhashApi &
    GetBalanceApi &
    GetBlockHeightApi &
    GetSlotApi &
    GetAccountInfoApi &
    SendTransactionApi &
    GetSignatureStatusesApi &
    SimulateTransactionApi &
    GetTransactionApi &
    GetMultipleAccountsApi &
    RequestAirdropApi;

type JsonRpcResponse = { error: Parameters<typeof getSolanaErrorFromJsonRpcError>[0] } | { result: unknown };

export function getThrowSolanaErrorResponseTransformer(): RpcResponseTransformer {
    return json => {
        const jsonRpcResponse = json as JsonRpcResponse;
        if ('error' in jsonRpcResponse) {
            throw getSolanaErrorFromJsonRpcError(jsonRpcResponse.error);
        }
        return jsonRpcResponse.result;
    };
}

/**
 * Creates a Solana RPC client with Phase 1 essential methods
 */
export function createKitLite(endpoint: string): Rpc<KitLiteApi> {
    // Create the API with minimal transformers
    const api = createJsonRpcApi<KitLiteApi>({
        requestTransformer: (request: RpcRequest) => request,
        responseTransformer: getThrowSolanaErrorResponseTransformer(),
    });

    // Use Kit's default transport
    const transport = createDefaultRpcTransport({ url: endpoint });

    // Combine API and transport into RPC client
    return createRpc({ api, transport });
}

/**
 * Wrapper class that provides a cleaner API without .send()
 *
 * The Connection class simplifies interaction with Solana RPC endpoints by:
 * - Automatically handling `.send()` calls internally
 * - Converting bigint values to numbers where safe
 * - Providing sensible defaults for common operations
 * - Offering escape hatch via `.raw` property for advanced usage
 */
export class Connection {
    private rpc: Rpc<KitLiteApi>;

    /**
     * Creates a new Connection to a Solana RPC endpoint
     *
     * @param endpoint - The RPC endpoint URL (e.g., 'https://api.mainnet-beta.solana.com')
     *
     * @example
     * ```typescript
     * const connection = new Connection('https://api.devnet.solana.com');
     * ```
     */
    constructor(endpoint: string) {
        this.rpc = createKitLite(endpoint);
    }

    /**
     * Fetches the latest blockhash from the cluster
     *
     * @param config - Optional configuration for commitment level
     * @returns Promise resolving to blockhash and last valid block height
     *
     * @example
     * ```typescript
     * const { value: { blockhash, lastValidBlockHeight } } = await connection.getLatestBlockhash();
     * console.log(`Blockhash: ${blockhash}, Valid until: ${lastValidBlockHeight}`);
     * ```
     */
    async getLatestBlockhash(
        config?: GetLatestBlockhashConfig,
    ): Promise<SolanaRpcResponse<GetLatestBlockhashApiResponse>> {
        return await this.rpc.getLatestBlockhash(config).send();
    }

    /**
     * Fetches the lamport balance of an account
     *
     * Automatically converts the bigint balance to a JavaScript number for convenience.
     * This is safe for balances up to 9,007,199,254,740,991 lamports (~9 million SOL).
     *
     * @param address - The account address to check
     * @param config - Optional configuration for commitment and context
     * @returns Promise resolving to balance in lamports as number
     * @throws {Error} If address is invalid
     *
     * @example
     * ```typescript
     * const balance = await connection.getBalance('11111111111111111111111111111112');
     * console.log(`Balance: ${balance / 1e9} SOL`);
     * ```
     */
    async getBalance(address: string, config?: GetBalanceConfig): Promise<number> {
        assertIsAddress(address);
        const result = await this.rpc.getBalance(address, config).send();
        return Number(result.value);
    }

    /**
     * Fetches the current block height of the cluster
     *
     * @returns Promise resolving to the current block height as number
     *
     * @example
     * ```typescript
     * const blockHeight = await connection.getBlockHeight();
     * console.log(`Current block height: ${blockHeight}`);
     * ```
     */
    async getBlockHeight(): Promise<number> {
        const result = await this.rpc.getBlockHeight().send();
        return Number(result);
    }

    /**
     * Fetches the current slot number
     *
     * @returns Promise resolving to the current slot as number
     *
     * @example
     * ```typescript
     * const slot = await connection.getSlot();
     * console.log(`Current slot: ${slot}`);
     * ```
     */
    async getSlot(): Promise<number> {
        const result = await this.rpc.getSlot().send();
        return Number(result);
    }

    /**
     * Fetches account information including balance and data
     *
     * Returns account data encoded in base64 format by default.
     *
     * @param address - The account address to fetch
     * @param options - Optional configuration including commitment, data slice, and min context slot
     * @returns Promise resolving to account info with base64 encoded data
     * @throws {Error} If address is invalid
     *
     * @example
     * ```typescript
     * const accountInfo = await connection.getAccountInfo('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
     * if (accountInfo.value) {
     *   console.log(`Owner: ${accountInfo.value.owner}`);
     *   console.log(`Lamports: ${accountInfo.value.lamports}`);
     * }
     * ```
     */
    async getAccountInfo(
        address: string,
        options?: GetAccountInfoOptions,
    ): Promise<SolanaRpcResponse<GetAccountInfoApiResponse<AccountInfoWithBase64EncodedData>>> {
        const encoding = 'base64';
        assertIsAddress(address);
        let minContextSlot: bigint | undefined = undefined;
        if (options?.minContextSlot && typeof options.minContextSlot === 'number') {
            minContextSlot = BigInt(options.minContextSlot);
        } else if (options?.minContextSlot && typeof options.minContextSlot === 'bigint') {
            minContextSlot = options.minContextSlot;
        }
        const config: GetAccountInfoApiCommonConfig &
            GetAccountInfoApiSliceableCommonConfig &
            Readonly<{
                encoding: 'base64';
            }> = {
            encoding,
            ...(options?.commitment && { commitment: options.commitment }),
            ...(options?.dataSlice && { dataSlice: options.dataSlice }),
            ...(minContextSlot !== undefined && { minContextSlot }),
        };

        return await this.rpc.getAccountInfo(address, config).send();
    }

    /**
     * Sends a signed transaction to the cluster
     *
     * Note: This method only sends the transaction. Use `sendAndConfirm()` to also wait for confirmation.
     * Retries are disabled by default and should be handled client-side.
     *
     * @param transaction - The signed transaction to send
     * @param options - Optional configuration for preflight checks and commitment
     * @returns Promise resolving to the transaction signature
     *
     * @example
     * ```typescript
     * const signature = await connection.sendTransaction(transaction);
     * console.log(`Transaction sent: ${signature}`);
     * ```
     */
    async sendTransaction(transaction: Transaction, options?: SendTransactionOptions): Promise<Signature> {
        const maxRetries = 0n; // Retry should be handled client-side
        const encoding = 'base64';
        const encoded = getBase64EncodedWireTransaction(transaction);

        let minContextSlot: bigint | undefined = undefined;
        if (options?.minContextSlot && typeof options.minContextSlot === 'number') {
            minContextSlot = BigInt(options.minContextSlot);
        } else if (options?.minContextSlot && typeof options.minContextSlot === 'bigint') {
            minContextSlot = options.minContextSlot;
        }

        const config: SendTransactionConfig &
            Readonly<{
                encoding: 'base64';
            }> = {
            encoding,
            maxRetries,
            ...(options?.skipPreflight !== undefined && { skipPreflight: options.skipPreflight }),
            ...(options?.preflightCommitment && { preflightCommitment: options.preflightCommitment }),
            ...(minContextSlot !== undefined && { minContextSlot }),
        };

        return await this.rpc.sendTransaction(encoded, config).send();
    }

    /**
     * Fetches the statuses of multiple transaction signatures
     *
     * @param signatures - Array of transaction signatures to check
     * @param searchTransactionHistory - Whether to search transaction history (default: false)
     * @returns Promise resolving to signature statuses including confirmation status and errors
     * @throws {Error} If any signature is invalid
     *
     * @example
     * ```typescript
     * const statuses = await connection.getSignatureStatuses(['signature1', 'signature2']);
     * statuses.value.forEach((status, i) => {
     *   console.log(`${signatures[i]}: ${status?.confirmationStatus || 'not found'}`);
     * });
     * ```
     */
    async getSignatureStatuses(
        signatures: string[],
        searchTransactionHistory?: boolean,
    ): Promise<SolanaRpcResponse<GetSignatureStatusesApiResponse>> {
        const verifiedSignatures = signatures.map(sig => {
            assertIsSignature(sig);
            return sig;
        });
        return await this.rpc
            .getSignatureStatuses(verifiedSignatures, { searchTransactionHistory: searchTransactionHistory ?? false })
            .send();
    }

    /**
     * Simulates a transaction to predict its effects without submitting it
     *
     * Useful for:
     * - Estimating compute units needed
     * - Checking if a transaction will succeed
     * - Debugging transaction failures
     *
     * @param transaction - The transaction to simulate
     * @param options - Optional configuration including signature verification and account data
     * @returns Promise resolving to simulation results including logs and compute units used
     *
     * @example
     * ```typescript
     * const simulation = await connection.simulateTransaction(transaction);
     * if (simulation.value.err) {
     *   console.error('Transaction would fail:', simulation.value.err);
     * } else {
     *   console.log(`Compute units used: ${simulation.value.unitsConsumed}`);
     * }
     * ```
     */
    async simulateTransaction(
        transaction: Transaction,
        options?: SimulateTransactionConfigBase,
    ): Promise<SolanaRpcResponse<SimulateTransactionApiResponseBase>> {
        const encoding = 'base64' as const;
        const encoded = getBase64EncodedWireTransaction(transaction);

        let minContextSlot: bigint | undefined = undefined;
        if (options?.minContextSlot && typeof options.minContextSlot === 'number') {
            minContextSlot = BigInt(options.minContextSlot);
        } else if (options?.minContextSlot && typeof options.minContextSlot === 'bigint') {
            minContextSlot = options.minContextSlot;
        }

        // Build base properties that are common to all configurations
        const baseProps = {
            encoding,
            ...(options?.commitment && { commitment: options.commitment }),
            ...(minContextSlot !== undefined && { minContextSlot }),
            ...(options?.accounts && {
                accounts: {
                    encoding: options.accounts.encoding,
                    addresses: options.accounts.addresses.map(addr => {
                        assertIsAddress(addr);
                        return addr as Address;
                    }),
                },
            }),
        };

        // Create config based on the specific combination of sigVerify and replaceRecentBlockhash
        if (options?.replaceRecentBlockhash === true) {
            // Case 1: replaceRecentBlockhash is true, sigVerify must be false or undefined
            const config = {
                ...baseProps,
                replaceRecentBlockhash: true,
                sigVerify: false as const,
            };
            return await this.rpc.simulateTransaction(encoded, config).send();
        } else if (options?.sigVerify === true) {
            // Case 2: sigVerify is true, replaceRecentBlockhash must be false or undefined
            const config = {
                ...baseProps,
                sigVerify: true as const,
                replaceRecentBlockhash: false as const,
            };
            return await this.rpc.simulateTransaction(encoded, config).send();
        } else {
            // Case 3: Default case - both can be false or undefined
            const config = {
                ...baseProps,
                ...(options?.sigVerify === false && { sigVerify: false as const }),
                ...(options?.replaceRecentBlockhash === false && { replaceRecentBlockhash: false as const }),
            };
            return await this.rpc.simulateTransaction(encoded, config).send();
        }
    }

    /**
     * Fetches a confirmed transaction by its signature
     *
     * @param signature - The transaction signature to fetch
     * @param options - Optional configuration for commitment level (default: 'confirmed')
     * @returns Promise resolving to transaction details including metadata and instructions
     * @throws {Error} If signature is invalid
     *
     * @example
     * ```typescript
     * const tx = await connection.getTransaction('signature123');
     * if (tx) {
     *   console.log(`Slot: ${tx.slot}`);
     *   console.log(`Fee: ${tx.meta?.fee} lamports`);
     * }
     * ```
     */
    async getTransaction(
        signature: string,
        options?: {
            commitment?: Commitment;
        },
    ): Promise<TransactionResponse> {
        assertIsSignature(signature);
        const maxSupportedTransactionVersion = 0 as const;
        return (await this.rpc
            .getTransaction(signature, {
                encoding: 'json' as const,
                commitment: options?.commitment ?? 'confirmed',
                maxSupportedTransactionVersion,
            })
            .send()) as TransactionResponse;
    }

    /**
     * Fetches information for multiple accounts in a single request
     *
     * More efficient than making multiple individual getAccountInfo calls.
     * Returns null for accounts that don't exist.
     *
     * @param addresses - Array of account addresses to fetch
     * @param options - Optional configuration including commitment and data slice
     * @returns Promise resolving to array of account infos (null if account doesn't exist)
     * @throws {Error} If any address is invalid
     *
     * @example
     * ```typescript
     * const accounts = await connection.getMultipleAccounts([
     *   'address1',
     *   'address2',
     *   'address3'
     * ]);
     * accounts.value.forEach((account, i) => {
     *   if (account) {
     *     console.log(`${addresses[i]}: ${account.lamports} lamports`);
     *   } else {
     *     console.log(`${addresses[i]}: Account not found`);
     *   }
     * });
     * ```
     */
    async getMultipleAccounts(
        addresses: string[],
        options?: GetAccountInfoOptions,
    ): Promise<SolanaRpcResponse<readonly GetAccountInfoApiResponse<AccountInfoWithBase64EncodedData>[]>> {
        const encoding = 'base64';
        const verifiedAddresses = addresses.map(addr => {
            assertIsAddress(addr);
            return addr as Address;
        });

        let minContextSlot: bigint | undefined = undefined;
        if (options?.minContextSlot && typeof options.minContextSlot === 'number') {
            minContextSlot = BigInt(options.minContextSlot);
        } else if (options?.minContextSlot && typeof options.minContextSlot === 'bigint') {
            minContextSlot = options.minContextSlot;
        }

        const config: GetAccountInfoApiCommonConfig &
            GetAccountInfoApiSliceableCommonConfig &
            Readonly<{
                encoding: 'base64';
            }> = {
            encoding,
            ...(options?.commitment && { commitment: options.commitment }),
            ...(options?.dataSlice && { dataSlice: options.dataSlice }),
            ...(minContextSlot !== undefined && { minContextSlot }),
        };

        return await this.rpc.getMultipleAccounts(verifiedAddresses, config).send();
    }

    /**
     * Request airdrop if balance is below threshold (devnet/testnet only)
     *
     * This method handles race conditions when using lower commitment levels by:
     * 1. Confirming the airdrop transaction
     * 2. Waiting for the balance to be queryable
     * 3. Ensuring account propagation across the network
     */
    async airdropIfNeeded(
        address: string,
        minBalance: number = 1_000_000_000, // 1 SOL default
        airdropAmount: number = 2_000_000_000, // 2 SOL default
        commitment: Commitment = 'finalized',
    ): Promise<{ airdropped: boolean; signature?: Signature; balance: number }> {
        assertIsAddress(address);

        // Check current balance
        const balance = await this.getBalance(address, { commitment });

        if (balance >= minBalance) {
            return { airdropped: false, balance };
        }

        try {
            // Request airdrop using raw RPC
            const signature = await this.rpc.requestAirdrop(address as Address, lamports(BigInt(airdropAmount))).send();

            // Wait for confirmation using the new system
            await confirmTransaction(this, signature, {
                timeout: 30000,
                pollInterval: 500,
                commitment,
            });

            // Wait for balance to be queryable at the specified commitment level
            // This prevents race conditions where the airdrop is confirmed but the account
            // hasn't propagated to all nodes yet
            const newBalance = await waitForBalance(this, address, minBalance, {
                timeout: 10000,
                pollInterval: commitment === 'processed' ? 250 : 500,
                commitment,
            });

            return {
                airdropped: true,
                signature,
                balance: newBalance,
            };
        } catch (error) {
            // Airdrop might not be available on mainnet
            logger.warn('Airdrop failed:', error);
            return { airdropped: false, balance };
        }
    }

    /**
     * Send a transaction and wait for confirmation using racing strategies
     *
     * This method uses an advanced confirmation system inspired by @solana/transaction-confirmation
     * that races multiple strategies for robust confirmation:
     * - Signature confirmation (success path)
     * - Block height monitoring (detects expired blockhash)
     * - Timeout (prevents hanging)
     */
    async sendAndConfirm(
        transaction: Transaction,
        options?: SendTransactionOptions & ConfirmationConfig,
    ): Promise<Signature> {
        let maxValidBlockHeight = options?.maxValidBlockHeight;
        const commitment = options?.commitment ?? 'confirmed';

        // Auto-calculate block height expiry if not provided and not explicitly skipped
        if (!maxValidBlockHeight && !options?.skipBlockHeightCheck) {
            try {
                const blockhash = await this.getLatestBlockhash({ commitment });
                maxValidBlockHeight = Number(blockhash.value.lastValidBlockHeight);
            } catch (error) {
                // If we can't get blockhash info, proceed without block height checking
                logger.warn('Could not fetch blockhash for block height monitoring:', error);
            }
        }

        // Ensure preflightCommitment matches commitment to avoid race conditions
        const sendOptions = {
            ...options,
            preflightCommitment: options?.preflightCommitment ?? commitment,
        };

        const signature = await this.sendTransaction(transaction, sendOptions);

        // Use the new racing confirmation system
        const confirmConfig: ConfirmationConfig = {
            commitment,
        };

        if (options?.timeout !== undefined) confirmConfig.timeout = options.timeout;
        if (options?.pollInterval !== undefined) confirmConfig.pollInterval = options.pollInterval;
        if (maxValidBlockHeight !== undefined) confirmConfig.maxValidBlockHeight = maxValidBlockHeight;
        if (options?.skipBlockHeightCheck !== undefined)
            confirmConfig.skipBlockHeightCheck = options.skipBlockHeightCheck;

        await confirmTransaction(this, signature, confirmConfig);

        return signature;
    }

    /**
     * Wait for a transaction to be confirmed using racing strategies
     * @deprecated Use confirmTransaction from @/helpers/confirmation instead
     */
    async waitForConfirmation(
        signature: Signature,
        timeout?: number,
        pollInterval?: number,
        commitment?: Commitment,
        maxValidBlockHeight?: number,
    ): Promise<void> {
        const config: ConfirmationConfig = {};

        if (timeout !== undefined) config.timeout = timeout;
        if (pollInterval !== undefined) config.pollInterval = pollInterval;
        if (commitment !== undefined) config.commitment = commitment;
        if (maxValidBlockHeight !== undefined) config.maxValidBlockHeight = maxValidBlockHeight;

        await confirmTransaction(this, signature, config);
    }

    /**
     * Provides direct access to the underlying Solana Kit RPC client
     *
     * Use this escape hatch when you need access to RPC methods not wrapped by this SDK,
     * or when you need full control over the request/response cycle.
     *
     * @returns The raw RPC client that requires manual .send() calls
     *
     * @example
     * ```typescript
     * // Access methods not wrapped by Kit Lite
     * const supply = await connection.raw.getSupply().send();
     *
     * // Use with full Kit configuration options
     * const result = await connection.raw
     *   .getAccountInfo(address, complexConfig)
     *   .send();
     * ```
     */
    get raw(): Rpc<KitLiteApi> {
        return this.rpc;
    }
}
