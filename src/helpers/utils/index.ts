import type { MicroLamports } from '@solana/kit';

export const replaceHttpWithWs = (url: string) => {
    return url.replace('http', 'ws');
};

export const getMicroLamports = (microLamports: MicroLamports | bigint | number): MicroLamports => {
    if (typeof microLamports === 'number') {
        return BigInt(microLamports) as MicroLamports;
    }
    return microLamports as MicroLamports;
};

export const safeJsonStringifyBigInt = (obj: unknown): string => {
    return JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    });
};
