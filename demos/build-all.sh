#!/bin/bash

echo "🔨 Building Kit Lite Demo..."
cd kit-lite-demo
pnpm install
pnpm build
echo "✅ Kit Lite Demo built"
echo ""

echo "🔨 Building @solana/kit Demo..."
cd ../kit-raw-demo
pnpm install
pnpm build
echo "✅ @solana/kit Demo built"
echo ""

echo "🔨 Building Gill Demo..."
cd ../gill-demo
pnpm install
pnpm build
echo "✅ Gill Demo built"
echo ""

echo "🔨 Building Web3JS Demo..."
cd ../web3js-demo
pnpm install
pnpm build
echo "✅ Web3JS Demo built"
echo ""

cd ..
echo "📊 Comparing bundle sizes..."
node compare-bundles.js