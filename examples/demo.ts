/**
 * Kit Lite Demo - Complete API Showcase
 *
 * This demo showcases the final Kit Lite API design:
 * - Connection class with simplified RPC methods
 * - TransactionBuilder with automatic compute estimation
 * - sendAndConfirm with commitment levels and error handling
 * - All the Phase 1 functionality
 */

import { createConnection, generateKeypair } from '../src';
import { getTransferSolInstruction } from '@solana-program/system';

const LOCALHOST_ENDPOINT = 'http://127.0.0.1:8899';
const COMMITMENT = 'processed';

async function main() {
    console.log('🚀 Kit Lite Demo - Final API Design\n');

    // Create connection to localhost
    const connection = createConnection(LOCALHOST_ENDPOINT);
    console.log('✅ Connected to localhost (Solana test validator)\n');

    // ========================================
    // 1. BASIC RPC METHODS (no .send() needed!)
    // ========================================
    console.log('=== Basic RPC Methods ===\n');

    try {
        // Get latest blockhash - notice no .send()!
        const blockhashInfo = await connection.getLatestBlockhash();
        console.log('Latest blockhash:', blockhashInfo.value.blockhash);
        console.log('Valid until block:', Number(blockhashInfo.value.lastValidBlockHeight));

        // Get current network info
        const slot = await connection.getSlot();
        const blockHeight = await connection.getBlockHeight();
        console.log('Current slot:', slot);
        console.log('Block height:', blockHeight, '\n');
    } catch (error) {
        console.error('❌ Error connecting to localhost - make sure Solana test validator is running');
        console.error('   Run: solana-test-validator');
        return;
    }

    // ========================================
    // 2. KEYPAIR CREATION
    // ========================================
    console.log('=== Keypair Creation ===\n');

    // Create keypairs for demo
    const payerSigner = await generateKeypair();
    console.log('Payer address:', payerSigner.address);

    const recipientSigner = await generateKeypair();
    console.log('Recipient address:', recipientSigner.address, '\n');

    // ========================================
    // 3. BALANCE CHECKING & AIRDROPS
    // ========================================
    console.log('=== Balance & Airdrop Demo ===\n');

    // Check initial balance
    let balance = await connection.getBalance(payerSigner.address, { commitment: COMMITMENT });
    console.log(`Initial balance: ${balance} lamports (${balance / 1e9} SOL)`);

    // Airdrop if needed (localhost test validator allows airdrops)
    if (balance < 1_000_000_000) {
        console.log('Balance low, requesting airdrop...');
        const airdropResult = await connection.airdropIfNeeded(
            payerSigner.address,
            500_000_000, // Min balance: 0.5 SOL
            2_000_000_000, // Airdrop amount: 2 SOL
            COMMITMENT,
        );

        if (airdropResult.airdropped) {
            console.log(`✅ Airdrop successful! Signature: ${airdropResult.signature}`);
            console.log(`New balance: ${airdropResult.balance} lamports\n`);
        } else {
            console.log(`Balance sufficient: ${airdropResult.balance} lamports\n`);
        }
    } else {
        console.log('Balance sufficient for demo\n');
    }

    // ========================================
    // 4. ACCOUNT INFO
    // ========================================
    console.log('=== Account Info Demo ===\n');

    const accountInfo = await connection.getAccountInfo(payerSigner.address, { commitment: COMMITMENT });
    if (accountInfo) {
        console.log('Account details:');
        console.log('  Lamports:', Number(accountInfo.lamports));
        console.log('  Owner:', accountInfo.owner);
        console.log('  Executable:', accountInfo.executable, '\n');
    }

    // ========================================
    // 5. TRANSACTION BUILDER - SIMPLE USAGE
    // ========================================
    console.log('=== TransactionBuilder - Simple Usage ===\n');

    // Create a transfer instruction
    const transferAmount = 100_000_000; // 0.1 SOL
    const transferInstruction = getTransferSolInstruction({
        source: payerSigner,
        destination: recipientSigner.address,
        amount: transferAmount,
    });

    // Build transaction with default settings (no compute estimation)
    console.log('Building simple transaction...');

    try {
        const signature1 = await connection.createTransaction({
            feePayer: payerSigner,
        })
            .add(transferInstruction)
            .prepare()
            .sendAndConfirm();

        console.log(`✅ Simple transaction successful! Signature: ${signature1}\n`);
    } catch (error) {
        console.error('❌ Simple transaction failed:', error);
        return;
    }

    // ========================================
    // 6. TRANSACTION BUILDER - COMPUTE ESTIMATION
    // ========================================
    console.log('=== TransactionBuilder - Compute Estimation ===\n');

    // Build transaction with compute estimation
    console.log('Building transaction with compute estimation...');
    const estimatedBuilder = connection.createTransaction({
        feePayer: payerSigner,
        computeLimit: 300_000, // Start with higher limit
        priorityFee: 5000n, // 5000 microlamports
    });

    try {
        const signature2 = await estimatedBuilder
            .add(transferInstruction)
            .prepare()
            .sendAndConfirm();

        console.log(`✅ Estimated transaction successful! Signature: ${signature2}\n`);
    } catch (error) {
        console.error('❌ Estimated transaction failed:', error);
        return;
    }

    // ========================================
    // 7. TRANSACTION BUILDER - BATCH OPERATIONS
    // ========================================
    console.log('=== TransactionBuilder - Batch Operations ===\n');

    // Create multiple transfer instructions
    const batchInstructions = [
        getTransferSolInstruction({
            source: payerSigner,
            destination: recipientSigner.address,
            amount: 50_000_000, // 0.05 SOL
        }),
        getTransferSolInstruction({
            source: payerSigner,
            destination: recipientSigner.address,
            amount: 75_000_000, // 0.075 SOL
        }),
    ];

    console.log('Building batch transaction with compute estimation...');
    const batchBuilder = connection.createTransaction({
        feePayer: payerSigner,
    });

    try {
        const signature3 = await batchBuilder
            .addMany(batchInstructions)
            .prepare()
            .sendAndConfirm();

        console.log(`✅ Batch transaction successful! Signature: ${signature3}\n`);
    } catch (error) {
        console.error('❌ Batch transaction failed:', error);
        return;
    }

    // ========================================
    // 8. MANUAL TRANSACTION BUILDING
    // ========================================
    console.log('=== Manual Transaction Building ===\n');

    // Build transaction but sign and send manually
    const manualBuilder = connection.createTransaction({
        feePayer: payerSigner,
    });

    try {
        const transaction = await manualBuilder
            .add(transferInstruction)
            .prepare()
            .build();

        const signature4 = await connection.sendTransaction(transaction);
        console.log(`✅ Manual transaction sent! Signature: ${signature4}`);

        // Wait for confirmation
        await connection.confirmTransaction(signature4);
        console.log('✅ Manual transaction confirmed!\n');
    } catch (error) {
        console.error('❌ Manual transaction failed:', error);
        return;
    }

    // ========================================
    // 9. COMMITMENT LEVELS
    // ========================================
    console.log('=== Commitment Levels Demo ===\n');

    const commitmentBuilder = connection.createTransaction({
        feePayer: payerSigner,
    });

    try {
        const signature5 = await commitmentBuilder
            .add(transferInstruction)
            .prepare()
            .sendAndConfirm({ commitment: 'finalized' });

        console.log(`✅ Finalized transaction successful! Signature: ${signature5}\n`);
    } catch (error) {
        console.error('❌ Finalized transaction failed:', error);
        return;
    }

    // ========================================
    // 10. ERROR HANDLING & SIMULATION
    // ========================================
    console.log('=== Error Handling Demo ===\n');

    try {
        // Try to get info for a non-existent account
        const fakeAddress = '11111111111111111111111111111112';
        const fakeAccountInfo = await connection.getAccountInfo(fakeAddress);
        console.log('Fake account info:', fakeAccountInfo.value ? 'Found' : 'Not found');
    } catch (error) {
        console.log('Expected error for fake account:', error);
    }

    // ========================================
    // 11. RAW RPC ACCESS
    // ========================================
    console.log('\n=== Raw RPC Access ===\n');

    // Access underlying Kit RPC for advanced usage
    const rawBalance = await connection.raw.getBalance(payerSigner.address).send();
    console.log('Balance via raw RPC:', Number(rawBalance.value), 'lamports');

    // Check final balances
    console.log('\n=== Final Balances ===');
    const finalPayerBalance = await connection.getBalance(payerSigner.address);
    const finalRecipientBalance = await connection.getBalance(recipientSigner.address);

    console.log(`Payer final balance: ${finalPayerBalance} lamports (${finalPayerBalance / 1e9} SOL)`);
    console.log(`Recipient final balance: ${finalRecipientBalance} lamports (${finalRecipientBalance / 1e9} SOL)`);

    console.log('\n✅ Demo completed successfully! 🎉');
}

// Run demo with comprehensive error handling
main().catch(error => {
    console.error('\n❌ Demo failed:');
    console.error('Error:', error);
    console.error('\nMake sure you have:');
    console.error('1. Solana CLI installed');
    console.error('2. Test validator running: solana-test-validator');
    console.error('3. Correct RPC endpoint: http://127.0.0.1:8899');
    process.exit(1);
});
