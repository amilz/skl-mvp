/**
 * Kit Lite Demo - Complete API Showcase
 *
 * This demo showcases the final Kit Lite API design:
 * - Connection class with simplified RPC methods
 * - TransactionBuilder with automatic compute estimation
 * - sendAndConfirm with commitment levels and error handling
 * - All the Phase 1 functionality
 */

import { Connection, TransactionBuilder, Keypair } from '../src';
import { getTransferSolInstruction } from '@solana-program/system';

const LOCALHOST_ENDPOINT = 'http://127.0.0.1:8899';
const COMMITMENT = 'processed';

async function main() {
    console.log('🚀 Kit Lite Demo - Final API Design\n');

    // Create connection to localhost
    const connection = new Connection(LOCALHOST_ENDPOINT);
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
    const payerSigner = await Keypair.generate();
    console.log('Payer address:', payerSigner.address);

    const recipientSigner = await Keypair.generate();
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
    if (accountInfo.value) {
        console.log('Account details:');
        console.log('  Lamports:', Number(accountInfo.value.lamports));
        console.log('  Owner:', accountInfo.value.owner);
        console.log('  Executable:', accountInfo.value.executable, '\n');
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
        const signature1 = await TransactionBuilder.create(connection, {
            feePayer: payerSigner,
        })
            .add(transferInstruction)
            .prepareAndSendAndConfirm(COMMITMENT);
        console.log(`   Signature: ${signature1}\n`);
    } catch (error) {
        console.log(`❌ Simple transaction failed: ${error}\n`);
    }

    // ========================================
    // 6. TRANSACTION BUILDER - WITH COMPUTE ESTIMATION
    // ========================================
    console.log('=== TransactionBuilder - With Compute Estimation ===\n');

    // Create another transfer
    const transferInstruction2 = getTransferSolInstruction({
        source: payerSigner,
        destination: recipientSigner.address,
        amount: 50_000_000, // 0.05 SOL
    });

    // Build transaction with compute estimation
    console.log('Building transaction with compute estimation...');
    const estimatedBuilder = TransactionBuilder.create(connection, {
        feePayer: payerSigner,
        computeLimit: 300_000, // Start with higher limit
        priorityFee: 5000n, // 5000 microlamports
    });

    try {
        console.log('Config before prepare:', estimatedBuilder.getConfig());

        await estimatedBuilder.add(transferInstruction2).prepare({
            estimateCompute: true,
            computeMargin: 0.15, // 15% margin
        });

        console.log('Config after prepare:', estimatedBuilder.getConfig());

        const signature2 = await estimatedBuilder.sendAndConfirm('confirmed');

        console.log(`✅ Estimated transaction confirmed!`);
        console.log(`   Signature: ${signature2}\n`);
    } catch (error) {
        console.log(`❌ Estimated transaction failed: ${error}\n`);
    }

    // ========================================
    // 7. TRANSACTION BUILDER - BATCH INSTRUCTIONS
    // ========================================
    console.log('=== TransactionBuilder - Batch Instructions ===\n');

    // Create multiple instructions
    const batchInstructions = [
        getTransferSolInstruction({
            source: payerSigner,
            destination: recipientSigner.address,
            amount: 25_000_000, // 0.025 SOL
        }),
        getTransferSolInstruction({
            source: payerSigner,
            destination: recipientSigner.address,
            amount: 25_000_000, // 0.025 SOL
        }),
    ];

    console.log('Building batch transaction with compute estimation...');
    const batchBuilder = TransactionBuilder.create(connection, {
        feePayer: payerSigner,
    });

    try {
        await batchBuilder.addMany(batchInstructions).setComputeLimit(250_000).setPriorityFee(10_000n).prepare({
            estimateCompute: true,
            computeMargin: 0.2, // 20% margin for safety
        });

        const signature3 = await batchBuilder.sendAndConfirm('finalized'); // Wait for finalized

        console.log(`✅ Batch transaction finalized!`);
        console.log(`   Signature: ${signature3}`);
        console.log(`   Instructions processed: ${batchBuilder.getInstructionCount()}\n`);
    } catch (error) {
        console.log(`❌ Batch transaction failed: ${error}\n`);
    }

    // ========================================
    // 8. MANUAL TRANSACTION SENDING
    // ========================================
    console.log('=== Manual Transaction Sending ===\n');

    // Build transaction but sign and send manually
    const manualBuilder = TransactionBuilder.create(connection, {
        feePayer: payerSigner,
    });

    const transferInstruction3 = getTransferSolInstruction({
        source: payerSigner,
        destination: recipientSigner.address,
        amount: 10_000_000, // 0.01 SOL
    });

    try {
        // Prepare the transaction
        await manualBuilder.add(transferInstruction3).prepare({ estimateCompute: true, computeMargin: 0.1 });

        // Sign manually
        const signature = await manualBuilder.sign();
        console.log('Transaction signed, signature:', signature);

        // Could send with connection.sendAndConfirm if needed
        console.log('✅ Manual signing successful\n');
    } catch (error) {
        console.log(`❌ Manual signing failed: ${error}\n`);
    }

    // ========================================
    // 9. COMMITMENT LEVELS DEMO
    // ========================================
    console.log('=== Commitment Levels Demo ===\n');

    const commitmentBuilder = TransactionBuilder.create(connection, {
        feePayer: payerSigner,
    });

    const transferInstruction4 = getTransferSolInstruction({
        source: payerSigner,
        destination: recipientSigner.address,
        amount: 5_000_000, // 0.005 SOL
    });

    try {
        // Test different commitment levels
        console.log('Testing with "processed" commitment...');
        await commitmentBuilder.reset().add(transferInstruction4).prepare({ estimateCompute: false });

        const processedSig = await commitmentBuilder.sendAndConfirm('processed'); // Fast confirmation

        console.log(`✅ Processed confirmation: ${processedSig}\n`);
    } catch (error) {
        console.log(`❌ Commitment test failed: ${error}\n`);
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
