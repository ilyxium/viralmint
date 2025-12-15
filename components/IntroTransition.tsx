"use client";

import React, { useEffect, useState } from "react";

export function IntroTransition({ onComplete, loading }: { onComplete: () => void; loading?: boolean }) {
    const [phase, setPhase] = useState<'enter' | 'loop' | 'exit'>('enter');

    useEffect(() => {
        // Mode 1: Auto-play Intro (Legacy/Initial Load)
        if (loading === undefined) {
            // Just play the whole sequence with simple timeouts
            setPhase('enter');
            const loopTimer = setTimeout(() => setPhase('loop'), 800);
            const exitTimer = setTimeout(() => setPhase('exit'), 1500);
            const doneTimer = setTimeout(onComplete, 2100);
            return () => {
                clearTimeout(loopTimer);
                clearTimeout(exitTimer);
                clearTimeout(doneTimer);
            };
        }

        // Mode 2: Search Loader (Controlled)
        if (loading) {
            // Even if loading is true, we start at 'enter'.
            // After 800ms (enter duration), we switch to 'loop'.
            const t = setTimeout(() => {
                setPhase(p => p !== 'exit' ? 'loop' : p);
            }, 800);
            return () => clearTimeout(t);
        } else {
            // Loading finished.
            // If we are still entering, we might want to wait? 
            // OR just force exit. Let's force exit for responsiveness, 
            // but arguably waiting for enter to finish is smoother.
            // Let's switch to exit immediately.
            setPhase('exit');
            const t = setTimeout(onComplete, 800); // Wait for exit anim
            return () => clearTimeout(t);
        }
    }, [loading, onComplete]);

    // Rot/Internet garbage text for the lens
    const rotText = `
    HTTP 404 DETECTED // TOKEN NOT FOUND // SEARCHING DEEP WEB // INDEXING SOLANA //
    PUMP.FUN SCAM FILTER // RUG CHECKER: ACTIVE // VOLUME: LOW // LIQUIDITY: LOCKED //
    CA: 8ztux...pump // WARN: HIGH RISKS // MEME DETECTED // TIKTOK API: BLOCKED //
    REEL ANALYSIS: 99% // SKIBIDI RIZLER // GYATT // FANUM TAX // BRAIN ROT //
    SEARCHING... SEARCHING... SEARCHING... // CONNECTION ESTABLISHED //
    HTTP 200 OK // GET /v1/chain/solana //
  `.repeat(10);

    // Map phase to class
    const animationClass = {
        enter: "animate-lens-enter",
        loop: "animate-lens-loop",
        exit: "animate-lens-exit",
    }[phase];

    // Is melting/exiting?
    const isMelting = phase === 'exit';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] overflow-hidden pointer-events-auto">

            {/* Background Noise */}
            <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] animate-noise pointer-events-none"></div>

            {/* Magnifying Glass Container */}
            <div
                className={`relative w-64 h-64 rounded-full overflow-hidden border-4 border-decay-500/50 bg-[#0a0a0b] ${animationClass} shadow-[0_0_50px_rgba(157,0,255,0.2)] z-10 ${isMelting ? 'border-transparent' : ''}`}
            // Use key to force re-render on phase change if distinct animations glitch? 
            // No, CSS classes switch is better for continuity if transforms match.
            // However, switching from loop to exit might need careful 'fill-mode' management.
            // Our exit starts at scale 0.9, loop ends at 0.9. It should match.
            >

                {/* Lens Glass Effect */}
                <div className="absolute inset-0 rounded-full bg-blue-500/5 mix-blend-overlay z-20 pointer-events-none radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)"></div>

                {/* Content Inside Lens (Scrolling Text) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-70">
                    <div className="w-full text-[10px] font-mono leading-none text-slime-500/80 break-all whitespace-pre-wrap animate-scan-scroll text-center blur-[0.5px]">
                        {rotText}
                    </div>
                </div>

                {/* Slime Drip Overlay (Appears on melt) */}
                <div className={`absolute inset-0 bg-gradient-to-b from-slime-500/20 to-transparent mix-blend-color-dodge transition-opacity duration-300 ${isMelting ? 'opacity-100' : 'opacity-0'}`}></div>

                {/* Chromatic Aberration Text Layer */}
                <div className="absolute inset-0 flex items-center justify-center z-30">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter animate-chromatic opacity-90 mix-blend-difference">
                        SEARCHING
                    </h2>
                </div>

            </div>

            {/* Post-processing Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000_120%)]"></div>

        </div>
    );
}
