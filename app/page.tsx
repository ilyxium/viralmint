"use client";

import React, { useState, useEffect } from "react";
import { DexscreenerCoin } from "@/lib/dexscreener";
import { ParseSocialResponse } from "@/app/api/parseSocial/route";
import { CoinCandidate } from "@/lib/extractSolanaTokens";
import { VideoSummaryCard } from "@/components/VideoSummaryCard";
import { CoinResultCard } from "@/components/CoinResultCard";
import dynamic from "next/dynamic";

import { WalletBalance } from "@/components/WalletBalance";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ParseSocialResponse["meta"] | null>(null);
  const [coins, setCoins] = useState<DexscreenerCoin[]>([]);
  const [candidates, setCandidates] = useState<CoinCandidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // State for filters
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setMeta(null);
    setCoins([]);
    setCandidates([]);
    setHasSearched(false);

    try {
      const res = await fetch("/api/parseSocial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: ParseSocialResponse = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setMeta(data.meta || null);
        setCoins(data.coins || []);
        setCandidates(data.candidates || []);
        setHasSearched(true);

        // Refresh counter immediately after search
        fetchStats();
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
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
        setShareUrl(fullUrl);

        // Copy to clipboard
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

  return (
    <div className={`min-h-screen flex flex-col items-center max-w-4xl mx-auto transition-all duration-500 ${isResultMode ? 'p-4 sm:p-8' : 'p-4 sm:p-6 md:p-12'}`}>
      <header className={`w-full max-w-5xl mx-auto px-4 py-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-500 ${isResultMode ? 'mb-4' : 'mb-6 sm:mb-8'}`}>
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
            viralscan
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-zinc-500 font-medium">Solana Edition</p>
            <div className="h-4 w-px bg-zinc-800"></div>
            {searchCount !== null && (
              <>
                <div className={`flex items-center gap-1.5 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                  <span className="text-sm">🔥</span>
                  <p className="text-orange-200/80 font-medium text-xs sm:text-sm">
                    <span className="text-orange-400 font-bold">{searchCount.toLocaleString()}</span> links scanned
                  </p>
                </div>
                <div className="h-4 w-px bg-zinc-800"></div>
              </>
            )}
            <div className="flex items-center gap-2">
              <a href="https://x.com/viralscansolana" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Wallet Removed */}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center w-full">
        <div className={`text-center w-full max-w-2xl transition-all duration-500 ${isResultMode ? 'mb-6' : 'mb-16'}`}>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight text-white">
            Find the <span className="text-[#9945FF]">Solana</span> coin <br />
            from any video.
          </h1>
          {!isResultMode && (
            <p className="text-lg text-zinc-400 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500">
              Paste a TikTok or Reel. <br className="hidden sm:block" />
              Hunt the ticker. Trade the trend.
            </p>
          )}
        </div>


        {/* Search Input */}
        <form onSubmit={handleSubmit} className={`w-full max-w-xl px-4 relative group transition-all duration-500 ${isResultMode ? 'mb-8' : 'mb-16'}`}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <div className="relative flex items-center bg-zinc-900 rounded-xl p-1.5 sm:p-2 border border-zinc-800 shadow-2xl">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste TikTok or Reel link..."
              className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 focus:ring-0 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg min-w-0"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">Analyzing</span>
                </span>
              ) : (
                "Analyze"
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-xl mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Results Section */}
        {(meta || coins.length > 0 || hasSearched) && !isLoading && !error && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Video Summary */}
            {meta && (
              <div className="space-y-4">
                <section>
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Video Source
                  </h2>
                  <VideoSummaryCard meta={meta} />
                </section>

                {/* Share Button */}
                {coins.length > 0 && (
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSharing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating Share Link...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Results
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Coin Results */}
            <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Found Tokens ({filteredCoins.length})</span>
                {filteredCoins.length === 0 && hasSearched && (
                  <span className="text-zinc-600 normal-case font-normal">
                    No tokens match filters
                  </span>
                )}
              </h2>

              {/* Filter Controls */}
              <div className="mb-6 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold">Min Cap ($)</label>
                      <input
                        type="text"
                        value={minMcapInput}
                        onChange={(e) => handleMinChange(e.target.value)}
                        placeholder="e.g. 5k, 1m"
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm w-28 text-zinc-300 focus:border-zinc-600 outline-none"
                      />
                    </div>
                    <div className="text-zinc-600">-</div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold">Max Cap ($)</label>
                      <input
                        type="text"
                        value={maxMcapInput}
                        onChange={(e) => handleMaxChange(e.target.value)}
                        placeholder="e.g. 10m"
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm w-32 text-zinc-300 focus:border-zinc-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showLowCap ? 'bg-purple-600 border-purple-600' : 'border-zinc-700 group-hover:border-zinc-600'}`}>
                        {showLowCap && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" checked={showLowCap} onChange={(e) => setShowLowCap(e.target.checked)} className="hidden" />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Show &lt; Min</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showHighCap ? 'bg-purple-600 border-purple-600' : 'border-zinc-700 group-hover:border-zinc-600'}`}>
                        {showHighCap && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" checked={showHighCap} onChange={(e) => setShowHighCap(e.target.checked)} className="hidden" />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Show &gt; Max</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Suffix Stripping Feedback */}
              {candidates.some(c => c.info?.suffix) && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {candidates.filter(c => c.info?.suffix).map(c => (
                      <span key={c.id}>
                        Searched for <span className="font-bold text-white">"{c.normalized}"</span> (stripped suffix <span className="font-mono bg-blue-500/20 px-1 rounded text-xs">"{c.info?.suffix}"</span> from "{c.info?.original}")
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
                  <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
                    <p className="text-zinc-400">
                      No obvious Solana tokens detected from this video.
                    </p>
                    <p className="text-sm text-zinc-600 mt-1">
                      It might be about another chain or not coin-related.
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
        )}
      </main>

      <footer className="w-full max-w-5xl mx-auto p-6 text-center text-zinc-600 text-xs">
        <p className="mb-2">
          &copy; {new Date().getFullYear()} ViralScan. Not financial advice.
        </p>
        <p>
          Trading cryptocurrencies carries a high level of risk. Do your own research.
        </p>
      </footer>
    </div>
  );
}
