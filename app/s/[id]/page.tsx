"use client";

import React, { useState, useEffect } from "react";
import { DexscreenerCoin } from "@/lib/dexscreener";
import { CoinResultCard } from "@/components/CoinResultCard";
import { VideoSummaryCard } from "@/components/VideoSummaryCard";
import { useParams } from "next/navigation";
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

export default function SharedResultsPage() {
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/share/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error("Share link not found or expired");
                return res.json();
            })
            .then((data) => setData(data))
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [id]);

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
        <div className="min-h-screen flex flex-col items-center max-w-4xl mx-auto p-4 sm:p-8 bg-zinc-950">
            <header className="w-full max-w-5xl mx-auto px-4 py-3 sm:p-4 mb-6">
                <Link href="/">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                        viralscan
                    </h1>
                </Link>
                <p className="text-zinc-500 text-sm mt-2">Shared Search Results</p>
            </header>

            <main className="w-full space-y-8">
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
                    <h2 className="text-xl font-bold text-zinc-100 mb-4">
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
                    <Link href="/" className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-xl transition-colors inline-block">
                        Search Your Own Link
                    </Link>
                </div>
            </main>
        </div>
    );
}
