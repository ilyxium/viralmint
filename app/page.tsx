"use client";

import React, { useState, useEffect } from "react";
import { DexscreenerCoin } from "@/lib/dexscreener";
import { ParseSocialResponse } from "@/app/api/parseSocial/route";
import { CoinCandidate } from "@/lib/extractSolanaTokens";
import { VideoSummaryCard } from "@/components/VideoSummaryCard";
import { CoinResultCard } from "@/components/CoinResultCard";
import dynamic from "next/dynamic";
import Link from "next/link";

import { WalletBalance } from "@/components/WalletBalance";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);
import { IntroTransition } from "@/components/IntroTransition";

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [showSearchLoader, setShowSearchLoader] = useState(false);
  const [isRipple, setIsRipple] = useState(false);
  const [isDecaying, setIsDecaying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ParseSocialResponse["meta"] | null>(null);
  const [coins, setCoins] = useState<DexscreenerCoin[]>([]);
  const [candidates, setCandidates] = useState<CoinCandidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleSearchLoaderComplete = () => {
    setShowSearchLoader(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const isPaste = newVal.length - url.length > 5;
    setUrl(newVal);

    if (isPaste) {
      // We don't have setInteractionState anymore, using direct setters
      setIsRipple(true);
      setIsDecaying(true);
      setTimeout(() => setIsRipple(false), 600);
      setTimeout(() => setIsDecaying(false), 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Trigger full screen loader
    setShowSearchLoader(true);
    setIsScanning(true);
    setIsLoading(true);
    setError(null);
    setMeta(null);
    setCoins([]);
    setCandidates([]);
    setHasSearched(false);

    // Minimum delay to let the scanner be seen
    const minTime = new Promise(r => setTimeout(r, 2000));

    try {
      const [res] = await Promise.all([
        fetch("/api/parseSocial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }),
        minTime
      ]);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse link");
      }

      const data: ParseSocialResponse = await res.json();
      setMeta(data.meta || null);
      setCoins(data.coins || []);
      setCandidates(data.candidates || []);
      setHasSearched(true);
      setShareId(null); // Reset share ID

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  const handleShare = async () => {
    if (!url || coins.length === 0) return;

    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, coins, meta }),
      });

      const data = await res.json();
      if (res.ok) {
        const fullUrl = `${window.location.origin}${data.shareUrl}`;

        // Copy to clipboard
        await navigator.clipboard.writeText(fullUrl);
        await navigator.clipboard.writeText(fullUrl);
        alert("Share link copied to clipboard!");
      } else {
        alert("Failed to create share link");
      }
    } catch (err) {
      alert("Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  const isResultMode = hasSearched || coins.length > 0 || !!meta;

  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const prevCountRef = React.useRef<number | null>(null);

  // Fetch stats with polling
  const fetchStats = () => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        const newCount = data.count;

        // Trigger shake if count changed
        if (prevCountRef.current !== null && newCount > prevCountRef.current) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }

        prevCountRef.current = newCount;
        setSearchCount(newCount);
      })
      .catch((err) => console.error("Failed to fetch stats", err));
  };

  // Fetch stats on mount and poll every 15 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);
  const [minMcap, setMinMcap] = useState<number>(10000);
  const [maxMcap, setMaxMcap] = useState<number>(250000000);

  // Text inputs for Mcap (to support "5k", "1m")
  const [minMcapInput, setMinMcapInput] = useState<string>("10000");
  const [maxMcapInput, setMaxMcapInput] = useState<string>("250000000");

  const [showLowCap, setShowLowCap] = useState(false);
  const [showHighCap, setShowHighCap] = useState(false);

  // Helper to parse "1k", "5m" etc.
  const parseMcap = (value: string): number => {
    const clean = value.toLowerCase().replace(/[^0-9.kmb]/g, "");
    let multiplier = 1;
    if (clean.endsWith("k")) multiplier = 1000;
    else if (clean.endsWith("m")) multiplier = 1000000;
    else if (clean.endsWith("b")) multiplier = 1000000000;

    const numPart = parseFloat(clean.replace(/[kmb]/g, ""));
    return isNaN(numPart) ? 0 : numPart * multiplier;
  };

  const handleMinChange = (val: string) => {
    setMinMcapInput(val);
    const parsed = parseMcap(val);
    if (parsed > 0) setMinMcap(parsed);
  };

  const handleMaxChange = (val: string) => {
    setMaxMcapInput(val);
    const parsed = parseMcap(val);
    if (parsed > 0) setMaxMcap(parsed);
  };

  // Filter Logic
  const filteredCoins = coins.filter(coin => {
    const fdv = coin.fdv || 0;
    if (showLowCap && fdv < minMcap) return true;
    if (showHighCap && fdv > maxMcap) return true;
    return fdv >= minMcap && fdv <= maxMcap;
  }).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

  return (
    <>


      {showIntro && <IntroTransition onComplete={() => setShowIntro(false)} />}
      <div className={`min-h-screen flex flex-col items-center max-w-4xl mx-auto transition-all duration-700 ${isScanning ? 'brightness-[0.4] scale-[0.98]' : ''} ${isResultMode ? 'p-4 sm:p-8' : 'p-4 sm:p-6 md:p-12'}`}>
        <header className={`w-full max-w-5xl mx-auto px-4 py-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-500 ${isResultMode ? 'mb-4' : 'mb-6 sm:mb-8'}`}>
          <div className="flex flex-col">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slime-500 to-toxic-500 hover-glitch cursor-pointer select-none">
                searchrot AI
              </h1>
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[#888] font-mono text-xs uppercase tracking-widest">Solana Terminal</p>
              <div className="h-4 w-px bg-decay-500"></div>
              {searchCount !== null && (
                <>
                  <div className={`flex items-center gap-1.5 bg-slime-500/10 px-2 py-0.5 rounded-sm border border-slime-500/20 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                    <span className="text-sm">️</span>
                    <p className="text-slime-400/80 font-mono text-xs sm:text-xs uppercase">
                      <span className="text-toxic-500 font-bold">{searchCount.toLocaleString()}</span> scans
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Wallet Removed */}
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center w-full">
          <div className={`text-center w-full max-w-2xl transition-all duration-500 ${isResultMode ? 'mb-6' : 'mb-16'}`}>
            <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tighter text-white uppercase leading-[0.9] hover-glitch">
              Enter the <span className="text-transparent bg-clip-text bg-gradient-to-r from-slime-500 to-toxic-500">rot</span>.<br />
              Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-toxic-500 to-slime-500">ticker</span>.
            </h1>
            {!isResultMode && (
              <p className="text-lg text-zinc-500 font-mono leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-lg mx-auto">
                Paste a TikTok or Reel. <br className="hidden sm:block" />
              </p>
            )}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSubmit} className={`w-full max-w-xl px-4 relative group transition-all duration-500 ${isResultMode ? 'mb-8' : 'mb-16'}`}>
            <div className={`absolute -inset-1 bg-gradient-to-r from-slime-500 to-toxic-500 rounded-lg opacity-20 transition duration-500 blur-md ${isRipple ? 'animate-ripple' : 'group-hover:opacity-60'}`}></div>

            <div className="relative flex items-center bg-[#0a0a0b] rounded-lg p-1 sm:p-1.5 border border-decay-500 shadow-2xl transition-colors overflow-hidden group-hover:border-slime-500/50">

              {/* Scan Beam */}
              {isScanning && (
                <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-toxic-500/20 to-transparent skew-x-12 animate-scan-beam z-10 pointer-events-none blur-sm"></div>
              )}

              <input
                type="text"
                value={url}
                onChange={handleInputChange}
                placeholder="Paste a TikTok or Reel..."
                className={`flex-1 bg-transparent border-none text-toxic-500 placeholder-zinc-700 focus:ring-0 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg min-w-0 font-mono transition-all ${isDecaying ? 'animate-text-decay' : ''}`}
              />
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="bg-zinc-100 hover:bg-toxic-500 hover:text-black text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 uppercase tracking-wide font-mono z-20"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">Scanning...</span>
                  </span>
                ) : (
                  "Scan"
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="w-full max-w-xl mb-8 p-4 bg-red-900/10 border border-red-500/30 rounded-lg text-red-500 text-center font-mono text-sm">
              ERROR: {error}
            </div>
          )}

          {/* Results Section */}
          {(meta || coins.length > 0 || hasSearched) && !isLoading && !error && (
            <div className="w-full relative min-h-[50vh]">
              {/* Slime Overlay */}
              <div className="absolute inset-0 z-30 bg-slime-500/20 backdrop-blur-[2px] animate-slime-peel pointer-events-none rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slime-500/10 to-transparent"></div>
              </div>

              {/* Content Container (Snaps to focus) */}
              <div className="w-full space-y-8 animate-snap-focus">

                {/* Video Summary */}
                {meta && (
                  <div className="space-y-4">
                    <section>
                      <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3 font-mono">
                        Source Identified
                      </h2>
                      <VideoSummaryCard meta={meta} />
                    </section>

                    {/* Share Button */}
                    {coins.length > 0 && (
                      <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-decay-500 text-zinc-300 font-mono font-bold px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                      >
                        {isSharing ? (
                          <>
                            <span className="animate-pulse">Generating Link...</span>
                          </>
                        ) : (
                          <>
                            <span>Share Results</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Coin Results */}
                <section>
                  <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3 flex items-center justify-between font-mono">
                    <span>Detected Assets ({filteredCoins.length})</span>
                    {filteredCoins.length === 0 && hasSearched && (
                      <span className="text-zinc-600 normal-case font-normal">
                        No matches found
                      </span>
                    )}
                  </h2>

                  {/* Filter Controls */}
                  <div className="mb-6 p-4 bg-[#0a0a0b] rounded-lg border border-decay-500">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase text-zinc-600 font-bold font-mono">Min Cap</label>
                          <input
                            type="text"
                            value={minMcapInput}
                            onChange={(e) => handleMinChange(e.target.value)}
                            placeholder="5k"
                            className="bg-black border border-decay-500 rounded px-2 py-1 text-sm w-28 text-toxic-500 focus:border-toxic-500 outline-none font-mono"
                          />
                        </div>
                        <div className="text-zinc-700">-</div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase text-zinc-600 font-bold font-mono">Max Cap</label>
                          <input
                            type="text"
                            value={maxMcapInput}
                            onChange={(e) => handleMaxChange(e.target.value)}
                            placeholder="10m"
                            className="bg-black border border-decay-500 rounded px-2 py-1 text-sm w-32 text-toxic-500 focus:border-toxic-500 outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${showLowCap ? 'bg-slime-500 border-slime-500' : 'border-decay-500 group-hover:border-zinc-500'}`}>
                            {showLowCap && <div className="w-2 h-2 bg-black"></div>}
                          </div>
                          <input type="checkbox" checked={showLowCap} onChange={(e) => setShowLowCap(e.target.checked)} className="hidden" />
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-mono">Show &lt; Min</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${showHighCap ? 'bg-slime-500 border-slime-500' : 'border-decay-500 group-hover:border-zinc-500'}`}>
                            {showHighCap && <div className="w-2 h-2 bg-black"></div>}
                          </div>
                          <input type="checkbox" checked={showHighCap} onChange={(e) => setShowHighCap(e.target.checked)} className="hidden" />
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-mono">Show &gt; Max</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Suffix Stripping Feedback */}
                  {candidates.some(c => c.info?.suffix) && (
                    <div className="mb-4 p-3 bg-slime-500/5 border border-slime-500/20 rounded-lg text-sm text-slime-300 flex items-center gap-2 font-mono">
                      <span>
                        {candidates.filter(c => c.info?.suffix).map(c => (
                          <span key={c.id}>
                            Cleaned <span className="font-bold text-white">"{c.normalized}"</span> (removed <span className="bg-slime-500/20 px-1 text-xs">"{c.info?.suffix}"</span>)
                          </span>
                        ))}
                      </span>
                    </div>
                  )}

                  {/* Low Confidence Warning */}
                  {filteredCoins.length > 0 && Math.max(...filteredCoins.map(c => c.matchConfidence || 0)) < 3 && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-bold">Relevant token not found.</p>
                        <p className="text-yellow-400/80 mt-1">
                          We couldn't find any high-confidence matches. Showing potential results below, but they might be unrelated.
                        </p>
                      </div>
                    </div>
                  )}

                  {filteredCoins.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {filteredCoins.map((coin, index) => (
                        <CoinResultCard
                          key={coin.pairAddress}
                          coin={coin}
                          isMostRelevant={index === 0}
                        />
                      ))}
                    </div>
                  ) : (
                    hasSearched && (
                      <div className="text-center py-12 bg-[#0a0a0b] rounded-lg border border-decay-500 border-dashed">
                        <p className="text-zinc-600 font-mono text-sm">
                          No matching signals detected.
                        </p>
                      </div>
                    )
                  )}
                </section>

                {/* Debug/Candidates View (Optional, helpful for verification) */}
                {candidates.length > 0 && coins.length === 0 && (
                  <div className="mt-8 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">
                      Extracted Signals (Debug)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidates.map((c) => (
                        <span key={c.id} className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400 font-mono">
                          {c.source}: {c.normalized}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="w-full max-w-5xl mx-auto p-6 text-center text-zinc-700 text-[10px] uppercase tracking-widest font-mono">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Searchrot AI. Not financial advice.
          </p>
          <p>
            Do not feed the algorithm after midnight.
          </p>
        </footer>
      </div>
    </>
  );
}
