import { connect } from 'solana-kite';
import { address, lamports } from '@solana/kit';



async function demo() {
    const connection = connect();


    const slot = await connection.rpc.getSlot();
    console.log('Current slot:', slot);

    const balance = await connection.rpc.getBalance(address('11111111111111111111111111111111'));
    console.log('Balance:', balance);

    const keypair = await connection.createWallet({ airdropAmount: lamports(1000000000n) });

    const destination = await connection.createWallet();

    const transferAmount = lamports(100_000n);
    const transferInstruction = connection.transferLamports({
        source: keypair,
        destination: destination.address, 
        amount: transferAmount,
    });

    const signature1 = await connection.sendTransactionFromInstructions({
        feePayer: keypair,
        needsPriorityFees: true,
        //@ts-ignore 
        instructions: [transferInstruction],
    });
    console.log('Signature:', signature1);
}

demo().catch(console.error);
