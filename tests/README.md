# Testing Guide

This project uses **Vitest** with separate unit and integration test suites.

## Test Structure

```
tests/
├── unit/                       # Unit tests (fast, mocked)
│   ├── connection/            # Connection class tests
│   └── helpers/               # Helper utility tests
├── integration/               # Integration tests (slow, real network)
│   └── connection.test.ts     # Real RPC call tests
├── setup.ts                   # Unit test setup
├── setup.integration.ts       # Integration test setup
└── README.md                  # This file
```

## Running Tests

### Unit Tests (Fast)

```bash
npm run test:unit              # Run all unit tests
npm run test:watch             # Watch mode for unit tests
npm run test:coverage          # Unit tests with coverage report
```

### Integration Tests (Slow)

```bash
npm run test:integration       # Run integration tests
npm run test:watch:integration # Watch mode for integration tests
```

### All Tests

```bash
npm test                       # Run both unit and integration tests
```

## Integration Test Requirements

Integration tests make real RPC calls and require:

### Option 1: Local Test Validator (Recommended)

```bash
# Install Solana CLI if not already installed
solana-test-validator --reset
```

### Option 2: Use Devnet/Testnet

```bash
export TEST_RPC_ENDPOINT=https://api.devnet.solana.com
npm run test:integration
```

## Environment Variables

- `TEST_RPC_ENDPOINT`: RPC endpoint for integration tests (default: `http://127.0.0.1:8899`)
- `TEST_LOG_LEVEL`: Log level during integration tests (`DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT`)

## Writing Tests

### Unit Tests

- Mock all network calls
- Test business logic in isolation
- Fast execution (<5 seconds total)
- Located in `tests/unit/`

### Integration Tests

- Make real RPC calls
- Test end-to-end functionality
- Slower execution (network dependent)
- Located in `tests/integration/`
- Should work with local test validator

## Coverage

Coverage reports are generated for unit tests only:

```bash
npm run test:coverage
open coverage/index.html
```
