export type DexscreenerCoin = {
    pairAddress: string;
    chainId: string;
    dexId: string;
    baseToken: {
        address: string;
        symbol: string;
        name: string;
    };
    quoteToken: {
        address: string;
        symbol: string;
        name: string;
    };
    priceUsd?: string;
    liquidity?: {
        usd?: number;
    };
    volume?: {
        h24?: number;
    };
    fdv?: number;
    url: string; // Dexscreener URL
    isHighestFDV?: boolean;
    isHighestVolume?: boolean;
    matchConfidence?: number; // 0-10 score
};

export async function searchSolanaByQuery(query: string): Promise<DexscreenerCoin[]> {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            console.error("Dexscreener API error:", response.statusText);
            return [];
        }

        const data = await response.json();
        if (!data.pairs || !Array.isArray(data.pairs)) {
            return [];
        }

        // Filter for Solana only AND Liquidity > $6,000 (Scam/Dust filter)
        const solanaPairs = data.pairs.filter(
            (pair: any) => pair.chainId === "solana" && (pair.liquidity?.usd || 0) > 6000
        );

        console.log(`[DEXSCREENER] Query "${query}": ${data.pairs?.length || 0} total pairs, ${solanaPairs.length} Solana pairs >$6k`);

        // Map to our type
        const coins: DexscreenerCoin[] = solanaPairs.map((pair: any) => ({
            pairAddress: pair.pairAddress,
            chainId: pair.chainId,
            dexId: pair.dexId,
            baseToken: {
                address: pair.baseToken.address,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
            },
            quoteToken: {
                address: pair.quoteToken.address,
                symbol: pair.quoteToken.symbol,
                name: pair.quoteToken.name,
            },
            priceUsd: pair.priceUsd,
            liquidity: {
                usd: pair.liquidity?.usd,
            },
            volume: {
                h24: pair.volume?.h24,
            },
            fdv: pair.fdv,
            url: pair.url,
        }));

        // Sort by relevance:
        // 1. Exact symbol match (with space normalization)
        // 2. Pump.fun (User preference)
        // 3. FDV descending
        coins.sort((a, b) => {
            const queryNorm = query.toLowerCase().replace(/\s+/g, '');
            const aSymNorm = a.baseToken.symbol.toLowerCase().replace(/\s+/g, '');
            const bSymNorm = b.baseToken.symbol.toLowerCase().replace(/\s+/g, '');

            const aExact = aSymNorm === queryNorm;
            const bExact = bSymNorm === queryNorm;

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Prioritize Pump.fun
            const aIsPump = a.dexId === 'pump';
            const bIsPump = b.dexId === 'pump';

            if (aIsPump && !bIsPump) return -1;
            if (!aIsPump && bIsPump) return 1;

            return (b.fdv || 0) - (a.fdv || 0);
        });

        // Limit to top 10
        const topCoins = coins.slice(0, 10);

        // Determine badges
        if (topCoins.length > 0) {
            let maxFdv = -1;
            let maxVol = -1;

            topCoins.forEach(c => {
                if ((c.fdv || 0) > maxFdv) maxFdv = c.fdv || 0;
                if ((c.volume?.h24 || 0) > maxVol) maxVol = c.volume?.h24 || 0;
            });

            topCoins.forEach(c => {
                if ((c.fdv || 0) === maxFdv && maxFdv > 0) c.isHighestFDV = true;
                if ((c.volume?.h24 || 0) === maxVol && maxVol > 0) c.isHighestVolume = true;
            });
        }

        return topCoins;
    } catch (error) {
        console.error("Error searching Dexscreener:", error);
        return [];
    }
}
