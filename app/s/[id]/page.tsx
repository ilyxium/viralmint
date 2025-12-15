"use client";

import React, { useState, useEffect } from "react";
import { DexscreenerCoin } from "@/lib/dexscreener";
import { CoinResultCard } from "@/components/CoinResultCard";
import { VideoSummaryCard } from "@/components/VideoSummaryCard";
import Link from "next/link";

type ShareData = {
    url: string;
    coins: DexscreenerCoin[];
    meta: {
        title?: string;
        description?: string;
        image?: string;
        author?: string;
    };
    timestamp: number;
};

export default function SharedResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string | null>(null);
    const [data, setData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        params.then(({ id: paramId }) => {
            setId(paramId);
            fetch(`/api/share/${paramId}`)
                .then((res) => {
                    if (!res.ok) throw new Error("Share link not found or expired");
                    return res.json();
                })
                .then((data) => setData(data))
                .catch((err) => setError(err.message))
                .finally(() => setIsLoading(false));
        });
    }, [params]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-zinc-400">Loading shared results...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
                <h1 className="text-2xl font-bold text-zinc-100 mb-4">Share Link Not Found</h1>
                <p className="text-zinc-400 mb-8">This link may have expired or doesn't exist.</p>
                <Link href="/" className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg transition-colors">
                    Search Your Own
                </Link>
            </div>
        );
    }

    const filteredCoins = data ? data.coins.filter(coin => {
        const fdv = coin.fdv || 0;
        const minMcap = 10000;
        const maxMcap = 250000000;
        return fdv >= minMcap && fdv <= maxMcap;
    }).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)) : [];

    return (
        <div className="min-h-screen flex flex-col items-center max-w-4xl mx-auto p-4 sm:p-8">
            <header className="w-full max-w-5xl mx-auto px-4 py-3 sm:p-4 mb-6">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slime-500 to-toxic-500 hover-glitch cursor-pointer select-none">
                        searchrot AI
                    </h1>
                </Link>
                <div className="flex items-center gap-3 mt-2">
                    <p className="text-[#888] font-mono text-xs uppercase tracking-widest">Shared Search Results</p>
                    <div className="h-px bg-decay-500 flex-1"></div>
                </div>
            </header>

            <main className="w-full space-y-8 animate-snap-focus">
                {data.meta && (
                    <VideoSummaryCard
                        meta={{
                            platform: "unknown",
                            url: data.url,
                            title: data.meta.title,
                            caption: data.meta.description,
                            thumbnailUrl: data.meta.image,
                            authorName: data.meta.author,
                        }}
                    />
                )}

                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 mb-4 select-none">
                        FOUND TOKENS ({filteredCoins.length})
                    </h2>
                    <div className="space-y-4">
                        {filteredCoins.map((coin) => (
                            <CoinResultCard
                                key={coin.pairAddress}
                                coin={coin}
                                isMostRelevant={coin.matchConfidence === Math.max(...filteredCoins.map(c => c.matchConfidence || 0))}
                            />
                        ))}
                    </div>
                </div>

                <div className="text-center py-8">
                    <Link href="/" className="bg-[#0a0a0b] border border-slime-500/50 text-white font-bold font-mono uppercase tracking-wider px-8 py-4 rounded-xl hover:bg-slime-500/10 hover:border-slime-500 hover:shadow-[0_0_20px_rgba(157,0,255,0.3)] transition-all inline-block group">
                        <span className="group-hover:text-toxic-500 transition-colors">Start New Scan</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
