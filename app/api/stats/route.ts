import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
    try {
        const count = await kv.get<number>("search_count");
        return NextResponse.json({ count: count || 0 });
    } catch (error) {
        console.error("Failed to fetch stats:", error);
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}
