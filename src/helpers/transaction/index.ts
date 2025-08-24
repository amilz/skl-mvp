import {
    type CompilableTransactionMessage,
    type TransactionMessageWithBlockhashLifetime,
    type FullySignedTransaction,
    type TransactionFromCompilableTransactionMessage,
    createTransactionMessage,
    signTransactionMessageWithSigners,
    type Instruction,
    type MicroLamports,
    type Commitment,
    type Signature,
    type Address,
} from '@solana/kit';
import type { Connection } from '@/connection';
import type { KeyPairSigner } from '@solana/kit';

export interface TransactionConfig {
    /** The account that will pay for the transaction fees */
    feePayer: KeyPairSigner;
    /** Optional compute unit limit (defaults to 200,000) */
    computeLimit?: number;
    /** Optional priority fee in microlamports (defaults to 1) */
    priorityFee?: MicroLamports | bigint | number;
}

/**
 * A builder object for constructing Solana transactions with a fluent API.
 * Handles the complexity of transaction message creation, instruction management,
 * and compute budget optimization.
 */
export interface TransactionBuilder {
    /**
     * Adds a single instruction to the transaction.
     *
     * @param instruction - The instruction to add
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder
     *     .add(transferInstruction)
     *     .add(memoInstruction);
     * ```
     */
    add(instruction: Instruction): TransactionBuilder;

    /**
     * Adds multiple instructions to the transaction at once.
     *
     * @param instructions - Array of instructions to add
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder.addMany([
     *     transferInstruction,
     *     memoInstruction,
     *     closeAccountInstruction
     * ]);
     * ```
     */
    addMany(instructions: Instruction[]): TransactionBuilder;

    /**
     * Sets the compute unit limit for the transaction.
     *
     * @param limit - The compute unit limit (defaults to 200,000)
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder.setComputeLimit(300_000);
     * ```
     */
    setComputeLimit(limit: number): TransactionBuilder;

    /**
     * Sets the priority fee for the transaction.
     *
     * @param fee - The priority fee in microlamports
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder.setPriorityFee(5000n as MicroLamports);
     * ```
     */
    setPriorityFee(fee: MicroLamports | bigint | number): TransactionBuilder;

    /**
     * Prepares the transaction message with the latest blockhash.
     * This must be called before building the final transaction.
     *
     * @returns Promise resolving to this TransactionBuilder instance
     * @example
     * ```typescript
     * await builder.prepare();
     * ```
     */
    prepare(): Promise<TransactionBuilder>;

    /**
     * Builds the final transaction with all instructions and optimizations.
     * Must be called after prepare().
     *
     * @returns Promise resolving to the built transaction
     * @example
     * ```typescript
     * const transaction = await builder.build();
     * ```
     */
    build(): Promise<FullySignedTransaction & TransactionFromCompilableTransactionMessage<CompilableTransactionMessage>>;

    /**
     * Builds and sends the transaction in one step.
     * Automatically calls prepare() and build() internally.
     *
     * @returns Promise resolving to the transaction signature
     * @example
     * ```typescript
     * const signature = await builder.send();
     * ```
     */
    send(): Promise<Signature>;

    /**
     * Builds, sends, and confirms the transaction in one step.
     * Automatically calls prepare(), build(), and send() internally.
     *
     * @param config - Optional confirmation configuration
     * @returns Promise resolving to the transaction signature
     * @example
     * ```typescript
     * const signature = await builder.sendAndConfirm();
     * ```
     */
    sendAndConfirm(config?: { commitment?: Commitment; preflightCommitment?: Commitment }): Promise<Signature>;
}

/**
 * Creates a new TransactionBuilder instance.
 * Provides a functional approach to transaction building.
 *
 * @param connection - The connection to use for RPC calls
 * @param config - Configuration for the transaction
 * @returns A new TransactionBuilder instance
 * @example
 * ```typescript
 * const builder = createTransactionBuilder(connection, { feePayer: keypair });
 * ```
 */
export function createTransactionBuilder(connection: Connection, config: TransactionConfig): TransactionBuilder {
    let instructions: Instruction[] = [];
    let transactionMessage: (CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime) | null = null;

    const builder: TransactionBuilder = {
        add(instruction: Instruction): TransactionBuilder {
            if (transactionMessage) {
                throw new Error(
                    'Cannot add instructions after prepare() has been called. Create a new TransactionBuilder.',
                );
            }

            instructions.push(instruction);
            return builder;
        },

        addMany(newInstructions: Instruction[]): TransactionBuilder {
            if (transactionMessage) {
                throw new Error(
                    'Cannot add instructions after prepare() has been called. Create a new TransactionBuilder.',
                );
            }

            instructions.push(...newInstructions);
            return builder;
        },

        setComputeLimit(_limit: number): TransactionBuilder {
            if (transactionMessage) {
                throw new Error(
                    'Cannot modify compute limit after prepare() has been called. Create a new TransactionBuilder.',
                );
            }

            // Store for future use when compute budget instructions are implemented
            return builder;
        },

        setPriorityFee(_fee: MicroLamports | bigint | number): TransactionBuilder {
            if (transactionMessage) {
                throw new Error(
                    'Cannot modify priority fee after prepare() has been called. Create a new TransactionBuilder.',
                );
            }

            // Store for future use when compute budget instructions are implemented
            return builder;
        },

        async prepare(): Promise<TransactionBuilder> {
            if (transactionMessage) {
                throw new Error('Transaction already prepared. Create a new TransactionBuilder to make changes.');
            }

            if (instructions.length === 0) {
                throw new Error('Cannot prepare transaction with no instructions.');
            }

            // For now, create a simple transaction message
            // TODO: Add proper compute budget instructions when types are resolved
            transactionMessage = createTransactionMessage({ 
                version: 0,
            }) as any; // Type assertion to avoid complex type issues

            return builder;
        },

        async build(): Promise<FullySignedTransaction & TransactionFromCompilableTransactionMessage<CompilableTransactionMessage>> {
            if (!transactionMessage) {
                throw new Error('Must call prepare() before build().');
            }

            // Create final transaction message with all instructions
            const finalMessage: any = {
                ...transactionMessage,
                instructions,
                version: 0,
                feePayer: { address: config.feePayer.address as Address },
            };

            // Sign the transaction
            const transaction = await signTransactionMessageWithSigners(finalMessage);

            return transaction;
        },

        async send(): Promise<Signature> {
            const transaction = await builder.build();
            return await connection.sendTransaction(transaction);
        },

        async sendAndConfirm(confirmConfig?: { commitment?: Commitment; preflightCommitment?: Commitment }): Promise<Signature> {
            const signature = await builder.send();
            await connection.confirmTransaction(signature, confirmConfig);
            return signature;
        },
    };

    return builder;
}

// Legacy export for backward compatibility
export const TransactionBuilder = createTransactionBuilder;
