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
        <div className={`rounded-lg border p-3 sm:p-4 transition-all hover-wet animate-pulse-once ${isMostRelevant ? 'bg-[#0a0a0b] border-slime-500 shadow-[0_0_20px_rgba(157,0,255,0.1)] glow-purple' : 'bg-[#0a0a0b] border-decay-500 hover:border-zinc-700 glow-purple'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base sm:text-lg text-white truncate font-mono">
                            {coin.baseToken.name}
                        </h3>
                        <span className="text-xs sm:text-sm text-toxic-500 shrink-0 font-mono">
                            {coin.baseToken.symbol}
                        </span>
                    </div>
                    <div className="flex items-center gap-x-1.5 gap-y-1 flex-wrap">
                        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 bg-black px-1.5 py-0.5 rounded border border-decay-500">
                            {coin.baseToken.address.slice(0, 4)}...
                            {coin.baseToken.address.slice(-4)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-toxic-500/10 text-toxic-500 border border-toxic-500/20 font-mono">
                            SOL
                        </span>

                        {/* DEX Badge */}
                        {coin.dexId && (
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase font-mono ${coin.dexId === 'raydium' ? 'bg-blue-900/20 text-blue-400 border-blue-900/40' :
                                coin.dexId === 'pump' ? 'bg-slime-500/20 text-slime-400 border-slime-500/40' :
                                    coin.dexId === 'orca' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/40' :
                                        coin.dexId === 'meteora' ? 'bg-pink-900/20 text-pink-400 border-pink-900/40' :
                                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                {coin.dexId === 'pump' ? 'Pump.fun' : coin.dexId}
                            </span>
                        )}

                        {isMostRelevant && (
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-slime-500/20 text-slime-400 border border-slime-500/40 flex items-center gap-1 font-mono">
                                👁️ SIGNAL
                            </span>
                        )}
                        {coin.isHighestFDV && (
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-900/20 text-yellow-400 border border-yellow-900/40 flex items-center gap-1 font-mono">
                                🏆 CAP
                            </span>
                        )}
                        {coin.isHighestVolume && (
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-900/20 text-orange-400 border border-orange-900/40 flex items-center gap-1 font-mono">
                                🔥 VOL
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-white font-mono tracking-tighter">
                        {formatPrice(coin.priceUsd)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-zinc-600 font-mono uppercase">Price USD</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-black/50 rounded p-2 border border-decay-500">
                    <div className="text-[10px] text-zinc-600 uppercase font-mono">24h Vol</div>
                    <div className="text-sm font-medium text-zinc-300 font-mono">
                        {formatCurrency(coin.volume?.h24)}
                    </div>
                </div>
                <div className="bg-black/50 rounded p-2 border border-decay-500">
                    <div className="text-[10px] text-zinc-600 uppercase font-mono">Liq</div>
                    <div className="text-sm font-medium text-zinc-300 font-mono">
                        {formatCurrency(coin.liquidity?.usd)}
                    </div>
                </div>
                <div className="bg-black/50 rounded p-2 border border-decay-500">
                    <div className="text-[10px] text-zinc-600 uppercase font-mono">FDV</div>
                    <div className="text-sm font-medium text-zinc-300 font-mono">
                        {formatCurrency(coin.fdv)}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                {/* 1. Copy CA (Full Width) */}
                <button
                    onClick={handleCopy}
                    className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#111] hover:bg-[#1a1a1a] text-xs font-bold text-zinc-400 hover:text-white transition-all border border-decay-500 active:scale-[0.98] uppercase tracking-wider font-mono"
                >
                    {copied ? (
                        <>
                            <span className="text-toxic-500">✓</span> Copied
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
                    className="flex items-center justify-center px-4 py-3 rounded-md bg-[#1a1d26] hover:bg-black text-sm font-bold text-blue-400 transition-colors border border-blue-900/20 hover:border-blue-500 font-mono uppercase tracking-wide"
                >
                    Dex ↗
                </a>

                {/* 3. Axiom */}
                <a
                    href={`https://axiom.trade/trade/${coin.baseToken.address}?ref=ilyx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-3 rounded-md bg-toxic-500 hover:bg-toxic-400 text-sm font-bold text-black transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)] font-mono uppercase tracking-wide"
                >
                    Axiom ⚔️
                </a>
            </div>
        </div>
    );
}
