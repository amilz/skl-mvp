import { Connection, Keypair, TransactionBuilder } from '../../src/index';
import { getTransferSolInstruction } from '@solana-program/system';

async function demo() {
    const connection = new Connection('https://api.devnet.solana.com');

    const slot = await connection.getSlot();
    console.log('Current slot:', slot);

    const balance = await connection.getBalance('11111111111111111111111111111111');
    console.log('Balance:', balance);

    const keypair = await Keypair.generate();
    await connection.airdropIfNeeded(keypair.address, 500_000_000, 2_000_000_000, 'processed');

    const destination = await Keypair.generate();

    const transferAmount = 100_000_000; // 0.1 SOL
    const transferInstruction = getTransferSolInstruction({
        source: keypair,
        destination: destination.address,
        amount: transferAmount,
    });
    const signature1 = await TransactionBuilder.create(connection, { feePayer: keypair })
        .add(transferInstruction)
        .prepareAndSendAndConfirm();

    console.log('Signature:', signature1);
}

demo().catch(console.error);
