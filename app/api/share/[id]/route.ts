import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

// POST: Save search results with a unique ID
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, data } = body;

        // Store in KV with 30-day TTL
        await kv.set(`share:${id}`, data, { ex: 60 * 60 * 24 * 30 });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("Failed to save share:", error);
        return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }
}

// GET: Retrieve shared search results
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const shareData = await kv.get(`share:${id}`);

        if (!shareData) {
            return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
        }

        return NextResponse.json(shareData);
    } catch (error) {
        console.error("Failed to retrieve share:", error);
        return NextResponse.json({ error: "Failed to retrieve share link" }, { status: 500 });
    }
}
