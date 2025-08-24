import { createConnection, generateKeypair } from '../../src';

async function main() {
    const connection = createConnection('https://api.devnet.solana.com');
    const keypair = await generateKeypair();
    
    console.log('Keypair address:', keypair.address);
    
    const balance = await connection.getBalance(keypair.address);
    console.log('Balance:', balance);
}

main().catch(console.error);