import {
    address,
    createSolanaClient,
    createTransaction,
    generateKeyPairSigner,
    Instruction,
    KeyPairSigner,
    prepareTransaction,
    SolanaClient,
    airdropFactory,
    lamports,
} from 'gill';
import { getTransferSolInstruction, MAX_COMPUTE_UNIT_LIMIT } from 'gill/programs';

async function prepareSendAndConfirmTransaction(
    client: SolanaClient,
    feePayer: KeyPairSigner,
    instructions: Instruction[],
) {
    const unpreparedTransaction = createTransaction({
        version: 'legacy',
        feePayer,
        instructions,
        computeUnitLimit: MAX_COMPUTE_UNIT_LIMIT,
        computeUnitPrice: 1n,
    });
    const transaction = await prepareTransaction({
        transaction: unpreparedTransaction,
        rpc: client.rpc,
        computeUnitLimitMultiplier: 1.1,
        computeUnitLimitReset: true,
        blockhashReset: true,
    });
    const signature = await client.sendAndConfirmTransaction(transaction);
    return signature;
}

async function demo() {
    const client = createSolanaClient({
        urlOrMoniker: 'devnet',
    });
    const { rpc } = client;

    const slot = await rpc.getSlot().send();
    console.log('Current slot:', slot);

    const balance = await rpc.getBalance(address('11111111111111111111111111111111')).send();
    console.log('Balance:', balance);

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

    const signature1 = await prepareSendAndConfirmTransaction(client, keypair, [transferInstruction]);
    console.log('Signature:', signature1);
}

demo().catch(console.error);
