import type { PrepareConfig } from '@/types';
import type { Blockhash, MicroLamports } from '@solana/kit';

export const PLACEHOLDER_BLOCKHASH = {
    blockhash: '11111111111111111111111111111111' as Blockhash,
    lastValidBlockHeight: 0n,
} as const;

export const DEFAULT_PRIORITY_FEE = 1n as MicroLamports;
export const DEFAULT_COMPUTE_LIMIT = 200_000;

export const DEFAULT_PREPARE_CONFIG: PrepareConfig = {
    estimateCompute: true,
    computeMargin: 0.1,
};
