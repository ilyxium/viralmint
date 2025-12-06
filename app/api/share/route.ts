import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { url, coins, meta } = await req.json();

        if (!url || !coins) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate short unique ID (6 characters)
        const id = nanoid(6);

        // Store in KV with 30-day TTL
        const shareData = {
            url,
            coins,
            meta,
            timestamp: Date.now(),
        };

        await kv.set(`share:${id}`, shareData, { ex: 2592000 }); // 30 days in seconds

        return NextResponse.json({ id, shareUrl: `/s/${id}` });
    } catch (error) {
        console.error("Failed to create share:", error);
        return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }
}
