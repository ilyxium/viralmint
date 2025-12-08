import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import * as cheerio from "cheerio";
import LanguageDetect from "languagedetect";
import { translate } from "google-translate-api-x";
import { parseSocialUrl } from "@/lib/parseSocialUrl";
import { extractSolanaCandidates, CoinCandidate } from "@/lib/extractSolanaTokens";
import { searchSolanaByQuery, DexscreenerCoin } from "@/lib/dexscreener";
import { normalizeText } from "@/lib/normalizeText";

// Initialize language detector
const lngDetector = new LanguageDetect();

export type ParseSocialResponse = {
    ok: boolean;
    error?: string;
    meta?: {
        platform: "tiktok" | "instagram" | "unknown";
        url: string;
        title?: string;
        caption?: string;
        thumbnailUrl?: string;
        authorName?: string;
    };
    candidates?: CoinCandidate[];
    coins?: DexscreenerCoin[];
};

export const maxDuration = 60; // Allow longer timeout for scraping

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        // Increment global search counter (fire and forget)
        try {
            await kv.incr("search_count");
        } catch (e) {
            console.error("Failed to increment search count:", e);
        }

        console.log(`\n=== PROCESSING URL: ${url} ===`);

        // 1. Parse and validate URL
        const parsed = parseSocialUrl(url);
        if (!parsed.isValid) {
            return NextResponse.json<ParseSocialResponse>(
                { ok: false, error: parsed.error || "Invalid URL" },
                { status: 400 }
            );
        }

        // 2. Fetch HTML
        // We use a bot-like user agent to encourage platforms to return server-side rendered metadata (OG tags)
        const userAgent =
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
        const mobileUserAgent =
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";

        // Resolve TikTok Shortened URLs (vm.tiktok.com or tiktok.com/t/)
        if (parsed.platform === "tiktok" && (url.includes("/t/") || url.includes("vm.tiktok.com"))) {
            try {
                console.log("Resolving TikTok short link with Mobile UA...");
                const redirectRes = await fetch(parsed.normalizedUrl, {
                    method: "GET",
                    redirect: "follow",
                    headers: {
                        "User-Agent": mobileUserAgent,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }
                });

                if (redirectRes.ok) {
                    // Check if URL changed to full video URL
                    if (redirectRes.url !== parsed.normalizedUrl && !redirectRes.url.includes("/t/") && !redirectRes.url.includes("vm.tiktok.com")) {
                        console.log("Resolved TikTok URL (HTTP):", redirectRes.url);
                        parsed.normalizedUrl = redirectRes.url;
                    } else {
                        // Scan body
                        const html = await redirectRes.text();
                        console.log("Short link HTML length:", html.length);

                        // Regex to find video URL (handles escaped slashes too)
                        // Looking for: tiktok.com/@user/video/12345
                        const match = html.match(/tiktok\.com\/@[\w\.]+\/video\/\d+/);
                        if (match) {
                            let foundUrl = match[0];
                            if (!foundUrl.startsWith("http")) foundUrl = "https://www." + foundUrl;
                            console.log("Resolved TikTok URL (Body Scan):", foundUrl);
                            parsed.normalizedUrl = foundUrl;
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to resolve TikTok redirect", e);
            }
        }

        // Try OEmbed for TikTok first as it's the official API
        let oembedMeta: any = null;
        if (parsed.platform === "tiktok") {
            try {
                // OEmbed requires the full video URL
                // Pass User-Agent to avoid blocking
                const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${parsed.normalizedUrl}`, {
                    headers: { "User-Agent": mobileUserAgent }
                });
                if (oembedRes.ok) {
                    oembedMeta = await oembedRes.json();
                }
            } catch (e) {
                console.error("TikTok OEmbed failed", e);
            }
        }

        const response = await fetch(parsed.normalizedUrl, {
            headers: {
                "User-Agent": userAgent,
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            return NextResponse.json<ParseSocialResponse>(
                { ok: false, error: "Failed to fetch URL content" },
                { status: 500 }
            );
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 3. Extract Metadata
        let ogTitle = $('meta[property="og:title"]').attr("content") || "";
        let ogDescription = $('meta[property="og:description"]').attr("content") || "";
        let ogImage = $('meta[property="og:image"]').attr("content") || "";

        // Fallback for Instagram: Check for JSON-LD or sharedData
        if (parsed.platform === "instagram" && (!ogDescription || !ogTitle)) {
            // Try to find the description in the title tag if og:title failed
            const titleTag = $('title').text();
            if (titleTag && !ogTitle) {
                ogTitle = titleTag;
            }

            // Instagram often puts the caption in the meta description even if og:description is missing
            const metaDesc = $('meta[name="description"]').attr("content");
            if (metaDesc && !ogDescription) {
                ogDescription = metaDesc;
            }
        }

        // Use OEmbed data if available (TikTok)
        if (oembedMeta) {
            if (!ogTitle) ogTitle = oembedMeta.title || "";
            if (!ogDescription) ogDescription = oembedMeta.title || ""; // TikTok oembed often puts caption in title
            if (!ogImage) ogImage = oembedMeta.thumbnail_url || "";
        }

        // Check for generic TikTok error/unavailable message
        if (parsed.platform === "tiktok" && (ogTitle.includes("Visit TikTok to discover videos") || ogTitle.includes("Watch, follow, and discover"))) {
            return NextResponse.json<ParseSocialResponse>(
                { ok: false, error: "Video is unavailable, private, or region-locked." },
                { status: 400 }
            );
        }

        // Try to find author
        let authorName = oembedMeta?.author_name || "";
        if (!authorName) {
            // TikTok specific
            if (parsed.platform === "tiktok") {
                authorName = $('meta[name="author"]').attr("content") || "";
                if (!authorName) {
                    const titleMatch = ogTitle.match(/^(.+?) \(@/);
                    if (titleMatch) authorName = titleMatch[1];

                    // Handle "TikTok · Author Name" format
                    if (!authorName && ogTitle.startsWith("TikTok · ")) {
                        authorName = ogTitle.replace("TikTok · ", "").trim();
                    }
                }
            } else if (parsed.platform === "instagram") {
                // Instagram often puts author in title "Author (@handle) • Instagram photos..."
                const titleMatch = ogTitle.match(/^(.+?) \(@/);
                if (titleMatch) {
                    authorName = titleMatch[1];
                } else {
                    // Try "Name on Instagram" format
                    const altMatch = ogTitle.match(/^(.+?) on Instagram/);
                    if (altMatch) authorName = altMatch[1];
                }
            }
        }

        // Combine text for analysis
        let fullText = `${ogTitle} ${ogDescription}`;
        let translatedText = fullText;
        let detectedLanguage = "english";

        try {
            // Detect language
            const detections = lngDetector.detect(fullText, 1);
            if (detections.length > 0) {
                detectedLanguage = detections[0][0].toLowerCase();
                console.log(`Detected language: ${detectedLanguage}`);

                // If not English, translate
                if (detectedLanguage !== "english") {
                    console.log("Translating to English...");
                    const res = await translate(fullText, { to: "en" });
                    translatedText = res.text;
                    console.log(`Translated text: ${translatedText}`);
                }
            }
        } catch (e) {
            console.error("Language detection/translation failed:", e);
            // Fallback to original text
        }

        const meta = {
            platform: parsed.platform,
            url: parsed.normalizedUrl,
            title: ogTitle,
            caption: ogDescription,
            thumbnailUrl: ogImage,
            authorName: authorName || undefined,
        };

        // 4. Extract Solana Token Signals
        // Use translated text for better keyword matching

        // A. Normalize Text (Remove Author, Clean)
        const cleanText = normalizeText(translatedText, authorName);
        console.log("Cleaned Text:", cleanText);

        // B. Extract Candidates
        const candidates = extractSolanaCandidates(cleanText);

        // Inject Search Query Candidate (High Confidence)
        if (parsed.searchQuery) {
            console.log(`Injecting search query candidate: "${parsed.searchQuery}"`);
            // Normalize the query
            const normalizedQuery = normalizeText(parsed.searchQuery);
            if (normalizedQuery) {
                candidates.push({
                    id: `query-${normalizedQuery.replace(/\s+/g, '-')}`,
                    raw: parsed.searchQuery,
                    normalized: normalizedQuery,
                    confidence: 10, // Very high confidence for explicit search intent
                    source: "url_query"
                });
            }
        }

        // 5. Resolve via Dexscreener (Solana Only)
        const coinsMap = new Map<string, DexscreenerCoin>();

        // Helper to add coins (keeping highest confidence)
        const addCoins = (coins: DexscreenerCoin[]) => {
            for (const coin of coins) {
                const existing = coinsMap.get(coin.pairAddress);
                if (existing) {
                    // If new coin has higher confidence, replace it
                    if ((coin.matchConfidence || 0) > (existing.matchConfidence || 0)) {
                        coinsMap.set(coin.pairAddress, coin);
                    }
                } else {
                    coinsMap.set(coin.pairAddress, coin);
                }
            }
        };

        // Process candidates
        // We search for them, then rank/filter
        await Promise.all(candidates.map(async (candidate) => {
            let query = candidate.normalized;
            const results = await searchSolanaByQuery(query);

            // Apply stricter filtering for low-confidence candidates
            if (candidate.confidence < 5) {
                const filtered = results.filter(coin => {
                    const q = query.toLowerCase().replace(/\s+/g, '');
                    const symbol = coin.baseToken.symbol.toLowerCase().replace(/\s+/g, '');
                    const name = coin.baseToken.name.toLowerCase().replace(/\s+/g, '');

                    // SOFT BLOCK CHECK (confidence 0.5)
                    if (candidate.confidence === 0.5) {
                        const isExactSymbol = symbol === q;
                        const hasHighLiq = (coin.liquidity?.usd || 0) > 100000;
                        return isExactSymbol && hasHighLiq;
                    }

                    // Normal Low Confidence Check - allow partial matches with space normalization
                    const matches = symbol === q || name.startsWith(q) || symbol.startsWith(q);

                    return matches;
                });

                filtered.forEach(c => {
                    const existing = coinsMap.get(c.pairAddress);
                    const finalConfidence = candidate.confidence === 0.5 ? 7 : candidate.confidence;
                    if (!existing || finalConfidence > (existing.matchConfidence || 0)) {
                        coinsMap.set(c.pairAddress, { ...c, matchConfidence: finalConfidence });
                    }
                });
            } else {
                // For higher confidence candidates, add all results directly
                results.forEach(c => {
                    const existing = coinsMap.get(c.pairAddress);
                    const finalConfidence = candidate.confidence;
                    if (!existing || finalConfidence > (existing.matchConfidence || 0)) {
                        coinsMap.set(c.pairAddress, { ...c, matchConfidence: finalConfidence });
                    }
                });
            }
        }));

        // Convert to array and Sort
        const allCoins = Array.from(coinsMap.values()).sort((a, b) => {
            // 1. Sort by Confidence (High to Low)
            const confDiff = (b.matchConfidence || 0) - (a.matchConfidence || 0);
            if (confDiff !== 0) return confDiff;

            // 2. Sort by FDV (High to Low)
            return (b.fdv || 0) - (a.fdv || 0);
        });

        return NextResponse.json<ParseSocialResponse>({
            ok: true,
            meta,
            candidates,
            coins: allCoins,
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json<ParseSocialResponse>(
            { ok: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
