import {
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    signTransactionMessageWithSigners,
    getSignatureFromTransaction,
    compileTransaction,
    type CompilableTransactionMessage,
    type TransactionMessageWithBlockhashLifetime,
    type Instruction,
    type KeyPairSigner,
    type Signature,
    type MicroLamports,
    type Commitment,
    type FullySignedTransaction,
    type TransactionFromCompilableTransactionMessage,
} from '@solana/kit';
import {
    updateOrAppendSetComputeUnitLimitInstruction,
    updateOrAppendSetComputeUnitPriceInstruction,
    MAX_COMPUTE_UNIT_LIMIT,
} from '@solana-program/compute-budget';
import type { Connection } from '../../connection';
import {
    PLACEHOLDER_BLOCKHASH,
    DEFAULT_COMPUTE_LIMIT,
    DEFAULT_PRIORITY_FEE,
    DEFAULT_PREPARE_CONFIG,
} from '../utils/const';
import type { PrepareConfig } from '@/types';
import { getMicroLamports, safeJsonStringifyBigInt } from '../utils';
import { logger } from '../logger';

/**
 * Configuration options for creating a new transaction
 */
export interface TransactionConfig {
    /** The account that will pay for the transaction fees */
    feePayer: KeyPairSigner;
    /** Optional compute unit limit (defaults to MAX_COMPUTE_UNIT_LIMIT) */
    computeLimit?: number;
    /** Optional priority fee in microlamports (defaults to 1) */
    priorityFee?: MicroLamports | bigint | number;
}

/**
 * A builder class for constructing Solana transactions with a fluent API.
 * Handles the complexity of transaction message creation, instruction management,
 * and compute budget optimization.
 */
export class TransactionBuilder {
    private connection: Connection;
    private feePayer: KeyPairSigner;
    private instructions: Instruction[] = [];
    private computeLimit: number = DEFAULT_COMPUTE_LIMIT;
    private priorityFee: MicroLamports = DEFAULT_PRIORITY_FEE;
    private transactionMessage: (CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime) | null = null;

    /**
     * Creates a new TransactionBuilder instance.
     *
     * @param connection - The connection to use for RPC calls
     * @param config - Configuration for the transaction
     * @example
     * ```typescript
     * const builder = new TransactionBuilder(connection, {
     *     feePayer: keypair,
     *     computeLimit: 200_000,
     *     priorityFee: 5000n as MicroLamports
     * });
     * ```
     */
    constructor(connection: Connection, config: TransactionConfig) {
        this.connection = connection;
        this.feePayer = config.feePayer;
        this.computeLimit = config.computeLimit ?? DEFAULT_COMPUTE_LIMIT;
        this.priorityFee = config.priorityFee ? getMicroLamports(config.priorityFee) : DEFAULT_PRIORITY_FEE;
    }

    /**
     * Static factory method to create a new TransactionBuilder.
     * Provides a more functional approach to instantiation.
     *
     * @param connection - The connection to use for RPC calls
     * @param config - Configuration for the transaction
     * @returns A new TransactionBuilder instance
     * @example
     * ```typescript
     * const builder = TransactionBuilder.create(connection, { feePayer: keypair });
     * ```
     */
    static create(connection: Connection, config: TransactionConfig): TransactionBuilder {
        return new TransactionBuilder(connection, config);
    }

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
    add(instruction: Instruction): this {
        if (this.transactionMessage) {
            throw new Error(
                'Cannot add instructions after prepare() has been called. Create a new TransactionBuilder.',
            );
        }

        this.instructions.push(instruction);
        return this;
    }

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
    addMany(instructions: Instruction[]): this {
        if (this.transactionMessage) {
            throw new Error(
                'Cannot add instructions after prepare() has been called. Create a new TransactionBuilder.',
            );
        }

        this.instructions.push(...instructions);
        return this;
    }

    /**
     * Sets the compute unit limit for the transaction.
     *
     * @param limit - The compute unit limit
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder.setComputeLimit(200_000);
     * ```
     */
    setComputeLimit(limit: number): this {
        if (this.transactionMessage) {
            throw new Error('Cannot modify compute limit after prepare() has been called.');
        }

        this.computeLimit = limit;
        return this;
    }

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
    setPriorityFee(fee: MicroLamports | bigint | number): this {
        if (this.transactionMessage) {
            throw new Error('Cannot modify priority fee after prepare() has been called.');
        }

        this.priorityFee = getMicroLamports(fee);
        return this;
    }

    /**
     * Prepares the transaction by fetching the latest blockhash and creating
     * the transaction message with compute budget instructions.
     * This must be called before signing or sending the transaction.
     *
     * @returns This TransactionBuilder instance for method chaining
     * @throws Error if no instructions have been added
     * @example
     * ```typescript
     * const signature = await builder
     *     .add(instruction)
     *     .prepare()
     *     .sign()
     *     .send();
     * ```
     */
    async prepare(config: PrepareConfig = DEFAULT_PREPARE_CONFIG): Promise<this> {
        if (this.instructions.length === 0) {
            throw new Error('Cannot prepare transaction with no instructions. Use add() to add instructions first.');
        }

        if (this.transactionMessage) {
            throw new Error(
                'Transaction has already been prepared. Create a new TransactionBuilder to build another transaction.',
            );
        }

        if (config.estimateCompute && config.computeMargin < 0) {
            throw new Error('Compute margin must be a positive number');
        }

        if (config.estimateCompute && config.computeMargin > 1) {
            throw new Error('Compute margin must be a number between 0 and 1');
        }

        // Create the transaction message with placeholder blockhash and max compute limit
        const simulatedTransactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(this.feePayer, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(PLACEHOLDER_BLOCKHASH, tx),
            tx => updateOrAppendSetComputeUnitPriceInstruction(this.priorityFee, tx),
            tx => updateOrAppendSetComputeUnitLimitInstruction(MAX_COMPUTE_UNIT_LIMIT, tx),
            tx => appendTransactionMessageInstructions(this.instructions, tx),
        );

        if (config.estimateCompute) {
            try {
                const simulationTransaction = compileTransaction(simulatedTransactionMessage);

                const simulationResult = await this.connection.simulateTransaction(simulationTransaction, {
                    commitment: config.commitment ?? 'confirmed',
                    replaceRecentBlockhash: true,
                });
                if (simulationResult.value.err) {
                    logger.error('Transaction simulation failed:', safeJsonStringifyBigInt(simulationResult));
                    throw new Error('Failed to simulate transaction');
                }
                if (simulationResult.value.unitsConsumed == null) {
                    throw new Error('Failed to estimate compute units');
                }

                // Add margin to the consumed compute units with proper type handling
                const consumedUnits = Number(simulationResult.value.unitsConsumed);
                const estimatedCompute = Math.ceil(consumedUnits * (1 + config.computeMargin));
                this.computeLimit = Math.min(estimatedCompute, MAX_COMPUTE_UNIT_LIMIT);
            } catch (error) {
                throw error;
            }
        }

        const { value: latestBlockhash } = await this.connection.getLatestBlockhash();
        this.transactionMessage = pipe(
            simulatedTransactionMessage,
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            tx => updateOrAppendSetComputeUnitLimitInstruction(this.computeLimit, tx),
        );

        return this;
    }

    /**
     * Signs the prepared transaction.
     *
     * @returns Promise resolving to the transaction signature
     * @throws Error if prepare() hasn't been called first
     * @example
     * ```typescript
     * const signature = await builder
     *     .add(instruction)
     *     .prepare()
     *     .sign();
     * ```
     */
    async sign(): Promise<
        FullySignedTransaction & TransactionFromCompilableTransactionMessage<CompilableTransactionMessage>
    > {
        if (!this.transactionMessage) {
            throw new Error('Transaction must be prepared before signing. Call prepare() first.');
        }

        return await signTransactionMessageWithSigners(this.transactionMessage);
    }

    /**
     * Signs and sends the prepared transaction, then waits for confirmation.
     *
     * @param commitment - The commitment level to wait for (defaults to 'confirmed')
     * @returns Promise resolving to the transaction signature
     * @throws Error if prepare() hasn't been called first
     * @example
     * ```typescript
     * const signature = await builder
     *     .add(instruction)
     *     .prepare()
     *     .sendAndConfirm();
     * ```
     */
    async sendAndConfirm(commitment: Commitment = 'confirmed'): Promise<Signature> {
        if (!this.transactionMessage) {
            throw new Error('Transaction must be prepared before sending. Call prepare() first.');
        }

        const signedTransaction = await this.sign();
        const signature = getSignatureFromTransaction(signedTransaction);

        await this.connection.sendAndConfirm(signedTransaction, { commitment, preflightCommitment: commitment });

        return signature;
    }

    async prepareAndSendAndConfirm(
        commitment: Commitment = 'confirmed',
        prepareConfig: PrepareConfig = DEFAULT_PREPARE_CONFIG,
    ): Promise<Signature> {
        await this.prepare(prepareConfig);
        return this.sendAndConfirm(commitment);
    }

    /**
     * Gets the current instruction count.
     *
     * @returns The number of instructions currently added to the transaction
     * @example
     * ```typescript
     * console.log(`Transaction has ${builder.getInstructionCount()} instructions`);
     * ```
     */
    getInstructionCount(): number {
        return this.instructions.length;
    }

    /**
     * Gets the current configuration of the transaction builder.
     *
     * @returns Object containing current configuration
     * @example
     * ```typescript
     * const config = builder.getConfig();
     * console.log(`Compute limit: ${config.computeLimit}`);
     * ```
     */
    getConfig(): {
        feePayer: string;
        computeLimit: number;
        priorityFee: MicroLamports;
        instructionCount: number;
        isPrepared: boolean;
    } {
        return {
            feePayer: this.feePayer.address,
            computeLimit: this.computeLimit,
            priorityFee: this.priorityFee,
            instructionCount: this.instructions.length,
            isPrepared: this.transactionMessage !== null,
        };
    }

    /**
     * Resets the builder to its initial state, allowing it to be reused.
     * Clears all instructions and prepared state.
     *
     * @returns This TransactionBuilder instance for method chaining
     * @example
     * ```typescript
     * builder.reset().add(newInstruction).prepare().send();
     * ```
     */
    reset(): this {
        this.instructions = [];
        this.transactionMessage = null;
        return this;
    }
}
