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
    type Address,
    type Signature,

    // Transaction types and utilities
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
    type Lamports,
} from '@solana/kit';
import type {
    GetLatestBlockhashApiResponse,
    TransactionResponse,
    SendTransactionOptions,
    GetAccountInfoOptions,
    GetAccountInfoApiResponse,
    GetAccountInfoApiCommonConfig,
    GetSignatureStatusesApiResponse,
    SimulateTransactionConfigBase,
    SimulateTransactionApiResponseBase,
    GetBalanceConfig,
    GetLatestBlockhashConfig,
} from '@/types';
import { confirmTransaction, waitForBalance, type ConfirmationConfig } from '@/helpers/confirmation';
import { logger } from '@/helpers/logger';
import { createTransactionBuilder, type TransactionConfig } from '@/helpers/transaction';

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
 * Connection interface that provides a cleaner API without .send()
 *
 * The Connection object simplifies interaction with Solana RPC endpoints by:
 * - Automatically handling .send() calls internally
 * - Converting bigint values to numbers where safe
 * - Providing sensible defaults for common operations
 * - Offering escape hatch via .raw property for advanced usage
 */
export interface Connection {
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
    getLatestBlockhash(
        config?: GetLatestBlockhashConfig,
    ): Promise<SolanaRpcResponse<GetLatestBlockhashApiResponse>>;

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
    getBalance(address: string, config?: GetBalanceConfig): Promise<number>;

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
    getBlockHeight(): Promise<number>;

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
    getSlot(): Promise<number>;

    /**
     * Fetches account information including balance and data
     *
     * @param address - The account address to fetch
     * @param config - Optional configuration for commitment and encoding
     * @returns Promise resolving to account info or null if not found
     * @throws {Error} If address is invalid
     *
     * @example
     * ```typescript
     * const accountInfo = await connection.getAccountInfo('11111111111111111111111111111112');
     * if (accountInfo) {
     *     console.log(`Balance: ${accountInfo.lamports / 1e9} SOL`);
     *     console.log(`Owner: ${accountInfo.owner}`);
     * }
     * ```
     */
    getAccountInfo(
        address: string,
        config?: GetAccountInfoOptions,
    ): Promise<GetAccountInfoApiResponse<unknown> | null>;

    /**
     * Fetches multiple accounts at once
     *
     * @param addresses - Array of account addresses to fetch
     * @param config - Optional configuration for commitment and encoding
     * @returns Promise resolving to array of account infos (null for non-existent accounts)
     * @throws {Error} If any address is invalid
     *
     * @example
     * ```typescript
     * const accounts = await connection.getMultipleAccounts([
     *     '11111111111111111111111111111112',
     *     '11111111111111111111111111111113'
     * ]);
     * ```
     */
    getMultipleAccounts(
        addresses: string[],
        config?: GetAccountInfoApiCommonConfig,
    ): Promise<(GetAccountInfoApiResponse<unknown> | null)[]>;

    /**
     * Sends a transaction to the network
     *
     * @param transaction - The transaction to send
     * @param options - Optional send options
     * @returns Promise resolving to transaction signature
     *
     * @example
     * ```typescript
     * const signature = await connection.sendTransaction(transaction);
     * console.log(`Transaction sent: ${signature}`);
     * ```
     */
    sendTransaction(
        transaction: Transaction,
        options?: SendTransactionOptions,
    ): Promise<Signature>;

    /**
     * Simulates a transaction without sending it
     *
     * @param transaction - The transaction to simulate
     * @param config - Optional simulation configuration
     * @returns Promise resolving to simulation results
     *
     * @example
     * ```typescript
     * const simulation = await connection.simulateTransaction(transaction);
     * console.log(`Simulation successful: ${simulation.value.err === null}`);
     * ```
     */
    simulateTransaction(
        transaction: Transaction,
        config?: SimulateTransactionConfigBase,
    ): Promise<SimulateTransactionApiResponseBase>;

    /**
     * Gets the status of one or more transactions
     *
     * @param signatures - Array of transaction signatures to check
     * @param config - Optional configuration for commitment and search config
     * @returns Promise resolving to array of transaction statuses
     *
     * @example
     * ```typescript
     * const statuses = await connection.getSignatureStatuses([signature1, signature2]);
     * ```
     */
    getSignatureStatuses(
        signatures: Signature[],
        config?: { commitment?: Commitment; searchTransactionHistory?: boolean },
    ): Promise<GetSignatureStatusesApiResponse>;

    /**
     * Gets detailed information about a transaction
     *
     * @param signature - The transaction signature to fetch
     * @param config - Optional configuration for commitment and encoding
     * @returns Promise resolving to transaction details or null if not found
     *
     * @example
     * ```typescript
     * const tx = await connection.getTransaction(signature);
     * if (tx) {
     *     console.log(`Transaction fee: ${tx.meta?.fee} lamports`);
     * }
     * ```
     */
    getTransaction(
        signature: Signature,
        config?: { commitment?: Commitment; maxSupportedTransactionVersion?: number },
    ): Promise<TransactionResponse | null>;

    /**
     * Requests an airdrop of SOL to an account
     *
     * @param address - The account address to receive the airdrop
     * @param amount - Amount of lamports to airdrop
     * @param config - Optional configuration for commitment
     * @returns Promise resolving to transaction signature
     *
     * @example
     * ```typescript
     * const signature = await connection.requestAirdrop(
     *     '11111111111111111111111111111112',
     *     1_000_000_000 // 1 SOL
     * );
     * ```
     */
    requestAirdrop(
        address: string,
        amount: bigint,
        config?: { commitment?: Commitment },
    ): Promise<Signature>;

    /**
     * Waits for a transaction to be confirmed
     *
     * @param signature - The transaction signature to wait for
     * @param config - Optional confirmation configuration
     * @returns Promise resolving to confirmation status
     *
     * @example
     * ```typescript
     * const confirmation = await connection.confirmTransaction(signature);
     * console.log(`Transaction confirmed: ${confirmation.value.err === null}`);
     * ```
     */
    confirmTransaction(signature: Signature, config?: ConfirmationConfig): Promise<SolanaRpcResponse<{ err: any }>>;

    /**
     * Waits for an account's balance to reach a target amount
     *
     * @param address - The account address to monitor
     * @param targetBalance - The target balance in lamports
     * @param config - Optional configuration for timeout and commitment
     * @returns Promise resolving to the final balance
     *
     * @example
     * ```typescript
     * const finalBalance = await connection.waitForBalance(
     *     '11111111111111111111111111111112',
     *     1_000_000_000 // Wait for 1 SOL
     * );
     * ```
     */
    waitForBalance(
        address: string,
        targetBalance: bigint,
        config?: { timeout?: number; commitment?: Commitment },
    ): Promise<bigint>;

    /**
     * Request airdrop if balance is below threshold (devnet/testnet only)
     *
     * This method handles race conditions when using lower commitment levels by:
     * 1. Confirming the airdrop transaction
     * 2. Waiting for the balance to be queryable
     * 3. Ensuring account propagation across the network
     *
     * @param address - The account address to check and potentially airdrop to
     * @param minBalance - Minimum balance threshold in lamports (default: 1 SOL)
     * @param airdropAmount - Amount to airdrop in lamports (default: 2 SOL)
     * @param commitment - Commitment level for confirmation (default: 'finalized')
     * @returns Promise resolving to airdrop result with status and new balance
     *
     * @example
     * ```typescript
     * const result = await connection.airdropIfNeeded(
     *     '11111111111111111111111111111112',
     *     500_000_000, // Min balance: 0.5 SOL
     *     2_000_000_000 // Airdrop amount: 2 SOL
     * );
     * ```
     */
    airdropIfNeeded(
        address: string,
        minBalance?: number,
        airdropAmount?: number,
        commitment?: Commitment,
    ): Promise<{ airdropped: boolean; signature?: Signature; balance: number }>;

    /**
     * Creates a new transaction builder for constructing transactions
     *
     * @param config - Configuration for the transaction builder
     * @returns A new TransactionBuilder instance
     *
     * @example
     * ```typescript
     * const builder = connection.createTransaction({
     *     feePayer: keypair,
     *     computeLimit: 200_000,
     *     priorityFee: 5000n
     * });
     * ```
     */
    createTransaction(config: TransactionConfig): ReturnType<typeof createTransactionBuilder>;

    /**
     * Raw RPC client for advanced usage
     */
    readonly raw: Rpc<KitLiteApi>;
}

/**
 * Creates a new Connection to a Solana RPC endpoint
 *
 * @param endpoint - The RPC endpoint URL (e.g., 'https://api.mainnet-beta.solana.com')
 * @returns A Connection object with all the RPC methods
 *
 * @example
 * ```typescript
 * const connection = createConnection('https://api.devnet.solana.com');
 * ```
 */
export function createConnection(endpoint: string): Connection {
    const rpc = createKitLite(endpoint);

    return {
        async getLatestBlockhash(
            config?: GetLatestBlockhashConfig,
        ): Promise<SolanaRpcResponse<GetLatestBlockhashApiResponse>> {
            return await rpc.getLatestBlockhash(config).send();
        },

        async getBalance(address: string, config?: GetBalanceConfig): Promise<number> {
            assertIsAddress(address);
            const result = await rpc.getBalance(address, config).send();
            return Number(result.value);
        },

        async getBlockHeight(): Promise<number> {
            const result = await rpc.getBlockHeight().send();
            return Number(result);
        },

        async getSlot(): Promise<number> {
            const result = await rpc.getSlot().send();
            return Number(result);
        },

        async getAccountInfo(
            address: string,
            config?: GetAccountInfoOptions,
        ): Promise<GetAccountInfoApiResponse<unknown> | null> {
            assertIsAddress(address);
            const rpcConfig: any = {
                encoding: 'base64',
                commitment: config?.commitment,
                minContextSlot: config?.minContextSlot ? BigInt(config.minContextSlot) : undefined,
            };
            const result = await rpc.getAccountInfo(address as Address, rpcConfig).send();
            return result.value;
        },

        async getMultipleAccounts(
            addresses: string[],
            config?: GetAccountInfoApiCommonConfig,
        ): Promise<(GetAccountInfoApiResponse<unknown> | null)[]> {
            addresses.forEach(assertIsAddress);
            const result = await rpc.getMultipleAccounts(addresses as Address[], config).send();
            return result.value;
        },

        async sendTransaction(
            transaction: Transaction,
            options?: SendTransactionOptions,
        ): Promise<Signature> {
            const rpcConfig: any = {
                encoding: 'base64',
                skipPreflight: options?.skipPreflight,
                preflightCommitment: options?.preflightCommitment,
                minContextSlot: options?.minContextSlot ? BigInt(options.minContextSlot) : undefined,
            };
            const result = await rpc.sendTransaction(transaction as any, rpcConfig).send();
            return result;
        },

        async simulateTransaction(
            transaction: Transaction,
            config?: SimulateTransactionConfigBase,
        ): Promise<SimulateTransactionApiResponseBase> {
            const rpcConfig: any = {
                encoding: 'base64',
                commitment: config?.commitment,
                sigVerify: config?.sigVerify,
                replaceRecentBlockhash: config?.replaceRecentBlockhash,
                minContextSlot: config?.minContextSlot ? BigInt(config.minContextSlot) : undefined,
                accounts: config?.accounts,
            };
            const result = await rpc.simulateTransaction(transaction as any, rpcConfig).send();
            return result.value;
        },

        async getSignatureStatuses(
            signatures: Signature[],
            config?: { commitment?: Commitment; searchTransactionHistory?: boolean },
        ): Promise<GetSignatureStatusesApiResponse> {
            const result = await rpc.getSignatureStatuses(signatures, config).send();
            return result.value;
        },

        async getTransaction(
            signature: Signature,
            config?: { commitment?: Commitment; maxSupportedTransactionVersion?: number },
        ): Promise<TransactionResponse | null> {
            const rpcConfig: any = {
                encoding: 'json',
                commitment: config?.commitment,
                maxSupportedTransactionVersion: config?.maxSupportedTransactionVersion,
            };
            const result = await rpc.getTransaction(signature, rpcConfig).send();
            // The result is already the transaction response, not wrapped in a value property
            return result as TransactionResponse | null;
        },

        async requestAirdrop(
            address: string,
            amount: bigint,
            config?: { commitment?: Commitment },
        ): Promise<Signature> {
            assertIsAddress(address);
            const result = await rpc.requestAirdrop(address as Address, amount as Lamports, config).send();
            return result;
        },

        async confirmTransaction(signature: Signature, config?: ConfirmationConfig): Promise<SolanaRpcResponse<{ err: any }>> {
            const result = await confirmTransaction(this, signature, config);
            return result as any; // Type assertion to avoid complex return type issues
        },

        async waitForBalance(
            address: string,
            targetBalance: bigint,
            config?: { timeout?: number; commitment?: Commitment },
        ): Promise<bigint> {
            const waitConfig: any = {};
            if (config?.timeout !== undefined) waitConfig.timeout = config.timeout;
            if (config?.commitment !== undefined) waitConfig.commitment = config.commitment;
            
            const result = await waitForBalance(this, address, Number(targetBalance), waitConfig);
            return BigInt(result); // Convert number to bigint
        },

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
                const signature = await this.requestAirdrop(address, BigInt(airdropAmount), { commitment });

                // Wait for confirmation
                await this.confirmTransaction(signature, {
                    timeout: 30000,
                    pollInterval: 500,
                    commitment,
                });

                // Wait for balance to be queryable at the specified commitment level
                const newBalance = await this.waitForBalance(
                    address,
                    BigInt(minBalance),
                    {
                        timeout: 10000,
                        commitment,
                    }
                );

                return {
                    airdropped: true,
                    signature,
                    balance: Number(newBalance),
                };
            } catch (error) {
                // Airdrop might not be available on mainnet
                logger.warn('Airdrop failed:', error);
                return { airdropped: false, balance };
            }
        },

        createTransaction(config: TransactionConfig): ReturnType<typeof createTransactionBuilder> {
            return createTransactionBuilder(this, config);
        },

        get raw() {
            return rpc;
        },
    };
}

// Legacy export for backward compatibility
export const Connection = createConnection;
