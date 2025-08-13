import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';

const payer = Keypair.generate();
const destination = Keypair.generate();

const connection = new Connection('https://api.devnet.solana.com');

async function main() {
    const slot = await connection.getSlot();
    console.log('Slot:', slot);
    const balance = await connection.getBalance(new PublicKey('11111111111111111111111111111111'));
    console.log('Balance:', balance);

    await connection.requestAirdrop(payer.publicKey, 2000000000);
    const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: destination.publicKey,
            lamports: 1000000000,
        }),
    );
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = payer.publicKey;
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log('Signature:', signature);
}

main().catch(console.error);