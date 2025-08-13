import {
    estimateComputeUnitLimitFactory,
    MAX_COMPUTE_UNIT_LIMIT,
    updateOrAppendSetComputeUnitLimitInstruction,
    updateOrAppendSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget';
import {
    address,
    createSolanaRpc,
    appendTransactionMessageInstructions,
    pipe,
    Signature,
    TransactionSigner,
    MicroLamports,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    sendAndConfirmTransactionFactory,
    CompilableTransactionMessage,
    TransactionMessageWithBlockhashLifetime,
    getSignatureFromTransaction,
    Instruction,
    Rpc,
    RpcSubscriptions,
    SolanaRpcApi,
    SolanaRpcSubscriptionsApi,
    Commitment,
    generateKeyPairSigner,
    createSolanaRpcSubscriptions,
    airdropFactory,
    lamports,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';

interface Client {
    rpc: Rpc<SolanaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
}

export const createDefaultTransaction = async (
    client: Client,
    feePayer: TransactionSigner,
    computeLimit: number = MAX_COMPUTE_UNIT_LIMIT,
    feeMicroLamports: MicroLamports = 1n as MicroLamports,
) => {
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
    return pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(feePayer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => updateOrAppendSetComputeUnitPriceInstruction(feeMicroLamports, tx),
        tx => updateOrAppendSetComputeUnitLimitInstruction(computeLimit, tx),
    );
};
export const signAndSendTransaction = async (
    client: Client,
    transactionMessage: CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime,
    commitment: Commitment = 'confirmed',
) => {
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    await sendAndConfirmTransactionFactory(client)(signedTransaction, {
        commitment,
    });
    return signature;
};

async function sendAndConfirmInstructions(
    client: Client,
    payer: TransactionSigner,
    instructions: Instruction[],
    description: string,
): Promise<Signature> {
    try {
        const simulationTx = await pipe(await createDefaultTransaction(client, payer), tx =>
            appendTransactionMessageInstructions(instructions, tx),
        );
        const estimateCompute = estimateComputeUnitLimitFactory({ rpc: client.rpc });
        const computeUnitLimit = await estimateCompute(simulationTx);
        const signature = await pipe(
            await createDefaultTransaction(client, payer, computeUnitLimit),
            tx => appendTransactionMessageInstructions(instructions, tx),
            tx => signAndSendTransaction(client, tx),
        );
        console.log(`    - ${description} - Signature: ${signature}`);

        return signature;
    } catch (error) {
        throw new Error(
            `Failed to ${description.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

async function demo() {
    const client: Client = {
        rpc: createSolanaRpc('https://api.devnet.solana.com'),
        rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
    };
    const { rpc } = client;

    const slot = await rpc.getSlot().send();
    console.log('Current slot:', slot);

    const balance = await rpc.getBalance(address('11111111111111111111111111111111')).send();
    console.log('Balance:', balance.value);

    const keypair = await generateKeyPairSigner();
    const airdrop = airdropFactory({ rpc, rpcSubscriptions: client.rpcSubscriptions });
    await airdrop({
        commitment: 'processed',
        lamports: lamports(BigInt(1_000_000_000)),
        recipientAddress: keypair.address,
    });
    const destination = await generateKeyPairSigner();

    const transferAmount = 100_000_000;
    const transferInstruction = getTransferSolInstruction({
        source: keypair,
        destination: destination.address,
        amount: transferAmount,
    });

    const signature1 = await sendAndConfirmInstructions(client, keypair, [transferInstruction], 'Transfer');
    console.log('Signature:', signature1);
}

demo().catch(console.error);
