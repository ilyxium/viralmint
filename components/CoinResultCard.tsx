"use client";

import React from "react";
import { DexscreenerCoin } from "@/lib/dexscreener";

type CoinResultCardProps = {
    coin: DexscreenerCoin;
    isMostRelevant?: boolean;
};

export function CoinResultCard({ coin, isMostRelevant }: CoinResultCardProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(coin.baseToken.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined) return "-";
        if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
    };

    const formatPrice = (priceStr?: string) => {
        if (!priceStr) return "$0";
        const price = parseFloat(priceStr);
        if (price === 0) return "$0";

        if (price < 0.000001) {
            return `$${price.toExponential(4)}`;
        }
        if (price < 0.01) {
            return `$${price.toFixed(8).replace(/\.?0+$/, "")}`;
        }
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className={`rounded-xl border p-4 transition-colors ${isMostRelevant ? 'bg-zinc-900/80 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-zinc-100 truncate">
                            {coin.baseToken.name}
                        </h3>
                        <span className="text-sm text-zinc-400 shrink-0">
                            {coin.baseToken.symbol}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800">
                            {coin.baseToken.address.slice(0, 4)}...
                            {coin.baseToken.address.slice(-4)}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-900/50">
                            SOLANA
                        </span>

                        {/* DEX Badge */}
                        {coin.dexId && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase ${coin.dexId === 'raydium' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' :
                                coin.dexId === 'pump' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' :
                                    coin.dexId === 'orca' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
                                        coin.dexId === 'meteora' ? 'bg-pink-900/30 text-pink-400 border-pink-900/50' :
                                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                {coin.dexId === 'pump' ? 'Pump.fun' : coin.dexId}
                            </span>
                        )}

                        {isMostRelevant && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-900/50 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                💎 Most Relevant
                            </span>
                        )}
                        {coin.isHighestFDV && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400 border border-yellow-900/50 flex items-center gap-1">
                                🏆 High Cap
                            </span>
                        )}
                        {coin.isHighestVolume && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-900/50 flex items-center gap-1">
                                🔥 High Vol
                            </span>
                        )}
                        {coin.matchConfidence !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${coin.matchConfidence >= 8 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' :
                                coin.matchConfidence >= 5 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
                                    'bg-red-900/30 text-red-400 border-red-900/50'
                                }`}>
                                Confidence Score: {coin.matchConfidence}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-zinc-100">
                        {formatPrice(coin.priceUsd)}
                    </div>
                    <div className="text-xs text-zinc-500">Price USD</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-zinc-950/50 rounded p-2 border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase">24h Vol</div>
                    <div className="text-sm font-medium text-zinc-200">
                        {formatCurrency(coin.volume?.h24)}
                    </div>
                </div>
                <div className="bg-zinc-950/50 rounded p-2 border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase">Liquidity</div>
                    <div className="text-sm font-medium text-zinc-200">
                        {formatCurrency(coin.liquidity?.usd)}
                    </div>
                </div>
                <div className="bg-zinc-950/50 rounded p-2 border border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase">FDV</div>
                    <div className="text-sm font-medium text-zinc-200">
                        {formatCurrency(coin.fdv)}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                {/* 1. Copy CA (Full Width) */}
                <button
                    onClick={handleCopy}
                    className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-all border border-zinc-700/50 hover:border-zinc-600 active:scale-[0.98]"
                >
                    {copied ? (
                        <>
                            <span className="text-green-400">✓</span> Copied CA
                        </>
                    ) : (
                        <>
                            <span>📋</span> Copy CA
                        </>
                    )}
                </button>

                {/* 2. Dexscreener */}
                <a
                    href={coin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-[#1a1d26] hover:bg-[#20242f] text-sm font-bold text-blue-400 transition-colors border border-blue-900/30 hover:border-blue-500/50 shadow-lg shadow-blue-900/10"
                >
                    Dexscreener ↗
                </a>

                {/* 3. Axiom */}
                <a
                    href={`https://axiom.trade/trade/${coin.baseToken.address}?ref=ilyx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-colors shadow-lg shadow-indigo-500/20 border border-indigo-400/20"
                >
                    Axiom ⚔️
                </a>
            </div>
        </div>
    );
}
