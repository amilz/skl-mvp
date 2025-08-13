#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEMOS = [
    { name: 'Kit Lite', dir: 'kit-lite-demo', file: 'kit-lite-demo.js', emoji: '🚀' },
    { name: '@solana/kit', dir: 'kit-raw-demo', file: 'kit-raw-demo.js', emoji: '📦' },
    { name: 'Gill', dir: 'gill-demo', file: 'gill-demo.js', emoji: '🐟' },
    { name: 'web3.js', dir: 'web3js-demo', file: 'web3js-demo.js', emoji: '🌐' },
    // TODO Add more demos here as needed:
];

async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch (error) {
        return null;
    }
}

async function countLinesOfCode(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
        });
        return lines.length;
    } catch (error) {
        return null;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getDemoStats(demo) {
    const bundlePath = join(__dirname, demo.dir, 'dist', demo.file);
    const gzipPath = bundlePath + '.gz';
    const sourcePath = join(__dirname, demo.dir, 'index.ts');

    const size = await getFileSize(bundlePath);
    const gzipSize = await getFileSize(gzipPath);
    const linesOfCode = await countLinesOfCode(sourcePath);

    return {
        ...demo,
        bundlePath,
        sourcePath,
        size,
        gzipSize,
        linesOfCode,
        exists: size !== null,
    };
}

async function compareBundles() {
    console.log('📊 Bundle Size Comparison\n');
    console.log('='.repeat(60));

    // Get stats for all demos
    const stats = await Promise.all(DEMOS.map(getDemoStats));

    // Check if any demos are missing
    const missing = stats.filter(s => !s.exists);
    if (missing.length > 0) {
        console.log('❌ Missing bundles:\n');
        missing.forEach(demo => {
            console.log(`  ${demo.emoji} ${demo.name}: Run "cd demos/${demo.dir} && pnpm build"`);
        });
        console.log('');
    }

    // Filter to only existing demos
    const existing = stats.filter(s => s.exists);
    if (existing.length === 0) {
        console.log('No bundles found. Build the demos first!');
        return;
    }

    // Sort by size
    existing.sort((a, b) => a.size - b.size);

    // Display sizes
    console.log('📏 Bundle Sizes (minified):\n');
    existing.forEach(demo => {
        const loc = demo.linesOfCode ? `(${demo.linesOfCode} LOC)` : '';
        console.log(`  ${demo.emoji} ${demo.name.padEnd(15)} ${formatBytes(demo.size).padStart(10)} ${loc}`);
    });

    console.log('\n' + '-'.repeat(60));

    // Display gzipped sizes if available
    const withGzip = existing.filter(s => s.gzipSize);
    if (withGzip.length > 0) {
        console.log('\n🗜️  Gzipped Sizes:\n');
        withGzip.sort((a, b) => a.gzipSize - b.gzipSize);
        withGzip.forEach(demo => {
            console.log(`  ${demo.emoji} ${demo.name.padEnd(15)} ${formatBytes(demo.gzipSize).padStart(10)}`);
        });
        console.log('\n' + '-'.repeat(60));
    }

    // Comparisons with the smallest bundle
    if (existing.length > 1) {
        const smallest = existing[0];
        const others = existing.slice(1);

        console.log('\n📈 Size Comparisons:\n');
        console.log(`  Baseline: ${smallest.emoji} ${smallest.name} (${formatBytes(smallest.size)})\n`);

        others.forEach(demo => {
            const increase = (((demo.size - smallest.size) / smallest.size) * 100).toFixed(1);
            const factor = (demo.size / smallest.size).toFixed(2);
            console.log(`  ${demo.emoji} ${demo.name}:`);
            console.log(`     ${factor}x larger (+${increase}%)`);
            console.log(`     ${formatBytes(demo.size - smallest.size)} more\n`);
        });
    }

    // Find Kit Lite specifically for special comparison
    const kitLite = existing.find(s => s.name === 'Kit Lite');
    const kitRaw = existing.find(s => s.name === '@solana/kit');

    if (kitLite && kitRaw) {
        console.log('-'.repeat(60));
        console.log('\n💡 Kit Lite vs @solana/kit:\n');

        if (kitLite.size < kitRaw.size) {
            const reduction = (((kitRaw.size - kitLite.size) / kitRaw.size) * 100).toFixed(1);
            console.log(`  ✨ Kit Lite is ${reduction}% smaller!`);
            console.log(`  💾 Saves ${formatBytes(kitRaw.size - kitLite.size)}`);
        } else {
            const increase = (((kitLite.size - kitRaw.size) / kitRaw.size) * 100).toFixed(1);
            console.log(`  ⚠️  Kit Lite is ${increase}% larger`);
            console.log(`  📊 This includes developer-friendly abstractions`);
        }
    }

    console.log('\n' + '='.repeat(60));

    // Generate markdown report
    await generateMarkdownReport(existing);
}

async function generateMarkdownReport(stats) {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = join(__dirname, 'bundle-comparison.md');

    let markdown = `# Bundle Size Comparison Report\n\n`;
    markdown += `Generated on: ${timestamp}\n\n`;

    markdown += `Each demo is a self-contained example of using the SDK (Gill, Kit Lite, and @solana/kit). Each demo generates a couple of KeyPairSigners, performs an airdrop, and transfers SOL between them. The demos are built to generate a bundle size comparison report using [compare-bundles.js](./demos/compare-bundles.js).\n`;
    markdown += `Check out [demos](./demos) for a comparison of the different SDKs. \n`;


    // Create comparison table
    markdown += `## Summary Table\n\n`;
    markdown += `| SDK | Bundle Size | Lines of Code | Size Factor |\n`;
    markdown += `|-----|-------------|---------------|-------------|\n`;

    const baseline = stats[0];
    stats.forEach(demo => {
        const factor = demo === baseline ? '1.00x' : `${(demo.size / baseline.size).toFixed(2)}x`;
        const loc = demo.linesOfCode || 'N/A';

        markdown += `| ${demo.name} | ${formatBytes(demo.size)} | ${loc} | ${factor} |\n`;
    });

    // Kit Lite specific analysis
    const kitLite = stats.find(s => s.name === 'Kit Lite');
    const kitRaw = stats.find(s => s.name === '@solana/kit');

    if (kitLite && kitRaw) {
        markdown += `\n## Kit Lite vs @solana/kit\n\n`;
        if (kitLite.size < kitRaw.size) {
            const reduction = (((kitRaw.size - kitLite.size) / kitRaw.size) * 100).toFixed(1);
            markdown += `Kit Lite is **${reduction}% smaller** than @solana/kit, saving ${formatBytes(kitRaw.size - kitLite.size)}.\n\n`;
        } else {
            const increase = (((kitLite.size - kitRaw.size) / kitRaw.size) * 100).toFixed(1);
            markdown += `Kit Lite is **${increase}% larger** than @solana/kit. This overhead includes developer-friendly abstractions and improved DX.\n\n`;
        }
    }

    markdown += `*Report generated by bundle comparison tool*\n`;

    await fs.writeFile(reportPath, markdown, 'utf8');
    console.log(`\n📄 Markdown report saved to: bundle-comparison.md`);
}

compareBundles().catch(console.error);
