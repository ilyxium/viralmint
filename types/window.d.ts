interface Window {
    Jupiter: {
        init: (props: {
            endpoint: string;
            strictTokenList?: boolean;
            defaultExplorer?: string;
            formProps?: {
                initialAmount?: string;
                initialInputMint?: string;
                initialOutputMint?: string;
            };
            passThroughWallet?: any; // Deprecated but keeping for safety
            enableWalletPassthrough?: boolean;
            passthroughWalletContextState?: any;
            platformFeeAndAccounts?: {
                feeBps: number;
                feeAccounts: Map<string, string>; // mint -> token account
            };
        }) => void;
    };
}
