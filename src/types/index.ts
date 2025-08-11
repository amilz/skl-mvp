import type {
    Blockhash,
    Base64EncodedDataResponse,
    Base58EncodedBytes,
    Commitment,
    AccountInfoBase,
    DataSlice,
    Slot,
    TransactionError,
    Lamports,
    TokenBalance,
    Reward,
    UnixTimestamp,
    Address,
    TransactionVersion,
} from '@solana/kit';

export type GetLatestBlockhashApiResponse = Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
}>;

type TransactionStatus = {
    confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
    confirmations: number | null;
    err: TransactionError | null;
    slot: number;
};

type ReturnData = {
    data: Base64EncodedDataResponse;
    programId: Address;
};
type TransactionMetaBase = Readonly<{
    computeUnitsConsumed?: bigint;
    err: TransactionError | null;
    fee: Lamports;
    logMessages: readonly string[] | null;
    postBalances: readonly Lamports[];
    postTokenBalances?: readonly TokenBalance[];
    preBalances: readonly Lamports[];
    preTokenBalances?: readonly TokenBalance[];
    returnData?: ReturnData;
    rewards: readonly Reward[] | null;
    status: TransactionStatus;
}>;

type TransactionBase = Readonly<{
    message: {
        recentBlockhash: Blockhash;
    };
    signatures: readonly Base58EncodedBytes[];
}>;
type InstructionWithStackHeight = Readonly<{
    stackHeight: number;
}>;
type InstructionWithData = Readonly<{
    data: Base58EncodedBytes;
}>;
type TransactionInstruction = InstructionWithData &
    Partial<InstructionWithStackHeight> &
    Readonly<{
        accounts: readonly number[];
        programIdIndex: number;
    }>;
type TransactionJson = Readonly<{
    message: {
        accountKeys: readonly Address[];
        header: {
            numReadonlySignedAccounts: number;
            numReadonlyUnsignedAccounts: number;
            numRequiredSignatures: number;
        };
        instructions: readonly TransactionInstruction[];
    };
}> &
    TransactionBase;

type GetTransactionApiResponseBase = Readonly<{
    blockTime: UnixTimestamp | null;
    slot: Slot;
}>;

type InnerInstructions<TInstructionType> = Readonly<{
    index: number;
    instructions: readonly TInstructionType[];
}>;
type TransactionMetaInnerInstructionsNotParsed = Readonly<{
    innerInstructions?: readonly InnerInstructions<TransactionInstruction>[] | null;
}>;

// Simplified transaction response for json encoding
export type TransactionResponse =
    | (GetTransactionApiResponseBase & {
          meta: (TransactionMetaBase & TransactionMetaInnerInstructionsNotParsed) | null;
          transaction: TransactionJson;
          version?: TransactionVersion;
      })
    | null;

export type SendTransactionOptions = {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    minContextSlot?: number | bigint;
};

export type SendTransactionConfig = Readonly<{
    maxRetries?: bigint;
    minContextSlot?: Slot;
    preflightCommitment?: Commitment;
    skipPreflight?: boolean;
}>;

export type GetAccountInfoOptions = {
    commitment?: Commitment;
    minContextSlot?: number | bigint;
    dataSlice?: DataSlice;
};

export type GetAccountInfoApiResponse<T> = (AccountInfoBase & T) | null;
export type GetAccountInfoApiCommonConfig = Readonly<{
    commitment?: Commitment;
    encoding: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
    minContextSlot?: Slot;
}>;
export type GetAccountInfoApiSliceableCommonConfig = Readonly<{
    dataSlice?: DataSlice;
}>;

type SignatureStatusResult = Readonly<{
    confirmationStatus: Commitment | null;
    confirmations: bigint | null;
    err: TransactionError | null;
    slot: Slot;
}>;
export type GetSignatureStatusesApiResponse = readonly (SignatureStatusResult | null)[];

export type SimulateTransactionConfigBase = {
    commitment?: Commitment;
    sigVerify?: boolean;
    replaceRecentBlockhash?: boolean;
    minContextSlot?: number | bigint;
    accounts?: {
        encoding?: 'base64';
        addresses: string[];
    };
};

export type SimulateTransactionApiResponseBase = Readonly<{
    err: TransactionError | null;
    logs: string[] | null;
    returnData: Readonly<{
        data: Base64EncodedDataResponse;
        programId: Address;
    }> | null;
    unitsConsumed?: bigint;
}>;

export type PrepareConfig = { commitment?: Commitment } & (
    | {
          estimateCompute: true;
          computeMargin: number; // as percentage (e.g., 10% adder = 0.1)
      }
    | {
          estimateCompute?: false;
      }
);

export type GetBalanceConfig = Readonly<{
    commitment?: Commitment;
    minContextSlot?: Slot;
}>;

export type GetLatestBlockhashConfig = Readonly<{
    commitment?: Commitment;
    minContextSlot?: Slot;
}>;
