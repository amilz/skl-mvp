import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';

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
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: destination.publicKey,
            lamports: 1000000000,
        }),
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log('Signature:', signature);
}

main().catch(console.error);