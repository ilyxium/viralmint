import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
