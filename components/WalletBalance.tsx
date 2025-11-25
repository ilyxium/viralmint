"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function WalletBalance() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        if (!publicKey) {
            setBalance(null);
            return;
        }

        const fetchBalance = async () => {
            try {
                const bal = await connection.getBalance(publicKey);
                setBalance(bal / LAMPORTS_PER_SOL);
            } catch (e) {
                console.error("Failed to fetch balance", e);
                // Retry once after a delay if it failed
                setTimeout(async () => {
                    try {
                        const bal = await connection.getBalance(publicKey);
                        setBalance(bal / LAMPORTS_PER_SOL);
                    } catch (retryError) {
                        console.error("Retry failed", retryError);
                        setBalance(0); // Fallback to 0
                    }
                }, 2000);
            }
        };

        fetchBalance();

        // Poll for balance changes every 10 seconds instead of using WSS subscription
        // to avoid "accountSubscribe" errors with public RPCs
        const intervalId = setInterval(fetchBalance, 10000);

        return () => {
            clearInterval(intervalId);
        };
    }, [connection, publicKey]);

    if (!publicKey) return null;

    return (
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-sm font-medium text-zinc-300 mr-2">
            <span>
                {balance !== null
                    ? balance.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "..."}
            </span>
            <span className="text-zinc-500">SOL</span>
        </div>
    );
}
