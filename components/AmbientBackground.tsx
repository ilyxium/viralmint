"use client";

import React, { useEffect, useState } from "react";

export function AmbientBackground() {
    const [mounted, setMounted] = useState(false);
    const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

    useEffect(() => {
        setMounted(true);
        // Increased particle count for better visibility
        const p = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 20,
            duration: 10 + Math.random() * 20, // Faster float: 10-30s
        }));
        setParticles(p);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden animate-global-glitch">

            {/* 1. Noise Layer (Increased opacity) */}
            <div className="absolute inset-0 opacity-[0.08] animate-noise mix-blend-overlay">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                </svg>
            </div>

            {/* 2. Micro Particles (Brighter, larger) */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute bottom-0 w-1.5 h-1.5 bg-white/40 rounded-full animate-float blur-[1px]"
                    style={{
                        left: `${p.left}%`,
                        animationDelay: `-${p.delay}s`,
                        //@ts-ignore
                        "--float-duration": `${p.duration}s`,
                        "--particle-opacity": 0.6,
                    } as React.CSSProperties}
                />
            ))}

            {/* 3. Occasional Horizontal Glitch Lines (High visibility) */}
            <div className="absolute top-[20%] left-0 w-full h-[2px] bg-toxic-500/40 opacity-0 animate-pulse delay-1000 duration-[15s]" />
            <div className="absolute top-[60%] left-0 w-full h-[4px] bg-slime-500/40 opacity-0 animate-pulse delay-[5000ms] duration-[23s]" />
        </div>
    );
}
