# Solana Kit Lite MVP

_Proof of Concept for discussion_

A developer-friendly wrapper around [@solana/kit](https://github.com/anza-xyz/kit) that simplifies complex APIs while maintaining full functionality.

## Why Kit Lite?

- **Only Essential Methods**: Only common RPC methods are included
- **Simplified API**: Eliminates the need for manual `.send()` calls on RPC methods
- **Simplified Imports**: Import _Connection_, _TransactionBuilder_, _Keypair_, and your target Program SDK -- that's it.
- **Better Developer Experience**: Intuitive method signatures with sensible defaults
- **Type Safety**: Converts `bigint` to `number` where safe, maintains strict TypeScript types
- **Full Compatibility**: Access to underlying Kit functionality via `.raw` property
- **Lightweight**: Only 2 dependencies (@solana/kit and @solana-program/compute-budget)

## Trade-offs

**What we gain:**

- Simplified developer experience with auto-send functionality
- Consistent API surface with predictable method signatures
- Built-in type conversions
- Simplified complex tasks like transaction building and confirmation racing

**What we lose:**

- **Tree shaking**: Class-based architecture prevents unused method elimination
- **Bundle size**: Includes all RPC methods even if only using a subset

For applications that only need 1-2 RPC methods, direct Kit usage may result in smaller bundles. For most Solana applications using multiple RPC calls, Kit Lite provides better DX with minimal size overhead.

## Core Features

### Auto-Send RPC Methods

```typescript
// Kit (underlying)
await rpc.getBalance(address).send();

// Kit Lite (this SDK)
await connection.getBalance(address);
```

### Seamless Integration with Codama SDKs

All RPC methods are auto-sent, so you don't need to call `.send()` on them.
Use `prepare()` to estimate compute and refresh the blockhash.

```ts
import { Connection, TransactionBuilder, Keypair } from '../src';
import { getTransferSolInstruction } from '@solana-program/system';

const connection = new Connection('https://api.devnet.solana.com');

const transferInstruction = getTransferSolInstruction({
    source: feePayer,
    destination: Keypair.generate().address,
    amount: 100_000_000,
});

const signature = await TransactionBuilder.create(connection, { feePayer })
    .add(transferInstruction)
    .prepareAndSendAndConfirm();
```

## Project Structure

```
src/
├── connection/           # Main Connection class with RPC methods
├── helpers/
│   ├── keypair/         # Keypair generation and utilities
│   ├── transaction/     # TransactionBuilder with compute estimation
│   ├── confirmation/    # Racing confirmation strategies
│   ├── errors/          # Solana error handling and mapping
│   ├── logger/          # Configurable logging system
│   └── utils/           # Type conversion and utility functions
└── types/               # Simplified TypeScript type definitions
```

## Development

### Prerequisites

- Node.js 18+
- PNPM (recommended)

### Setup

```bash
git clone <repository>
cd solana-kit-lite
pnpm install
```

### Available Scripts

```bash
pnpm build                   # Build TypeScript
pnpm test:unit               # Run unit tests (fast, mocked)
pnpm test:integration        # Run integration tests (requires validator)
pnpm test                    # Run all tests
pnpm demo                    # Run demo example
```

### Running Tests

#### Unit Tests (No Network Required)

```bash
pnpm test:unit
```

#### Integration Tests (Network Required)

```bash
# Start local validator first
solana-test-validator -r

# Run integration tests
pnpm test:integration
```

### Demo

The demo showcases all major functionality:

```bash
# Start validator
solana-test-validator -r

# Run demo in another terminal
pnpm demo
```

The demo demonstrates:

- Connection methods (balance, blockhash, account info)
- Airdrop handling with race condition prevention
- TransactionBuilder with compute estimation
- Transaction confirmation strategies
- Error handling and logging

## API Reference

### Connection Class

#### Core RPC Methods

- `getLatestBlockhash()` - Latest blockhash with validity info
- `getBalance(address)` - Account balance (returns `number`)
- `getBlockHeight()` - Current block height
- `getSlot()` - Current slot number
- `getAccountInfo(address)` - Account data (base64 encoded)
- `sendTransaction(transaction)` - Send signed transaction
- `simulateTransaction(transaction)` - Simulate transaction effects
- `getTransaction(signature)` - Fetch transaction details
- `getMultipleAccounts(addresses)` - Batch account info
- `sendAndConfirm(transaction)` - Send with confirmation racing

#### Helper Methods

- `airdropIfNeeded(address, minBalance?, amount?)` - Smart airdrop with confirmation
- `raw` - Access underlying @solana/kit RPC client for defined methods

### TransactionBuilder

Fluent API for transaction construction:

```typescript
const builder = TransactionBuilder.create(connection, { feePayer })
    .addInstruction(instruction1)
    .addInstructions([instruction2, instruction3])
    .setPriorityFee(microLamports)
    .setComputeLimit(units);
// or .prepare()

// Send with racing confirmation
const signature = await builder.sendAndConfirm({
    commitment: 'confirmed',
    timeout: 30000,
});
```

## Configuration

### Logging

```typescript
import { logger, LogLevel } from '@solana/smooth';

// Configure programmatically
logger.configure({ level: LogLevel.DEBUG });

// Or via environment variable
export KITLITE_LOG_LEVEL=DEBUG
```

### Environment Variables

- `KITLITE_LOG_LEVEL` - Set logging level (DEBUG, INFO, WARN, ERROR, SILENT)
- `TEST_RPC_ENDPOINT` - RPC endpoint for integration tests
