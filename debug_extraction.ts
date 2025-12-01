
import * as cheerio from "cheerio";
import LanguageDetect from "languagedetect";
import { translate } from "google-translate-api-x";
import { parseSocialUrl } from "./lib/parseSocialUrl";
import { extractSolanaCandidates, CoinCandidate } from "./lib/extractSolanaTokens";
import { searchSolanaByQuery, DexscreenerCoin } from "./lib/dexscreener";
import { normalizeText } from "./lib/normalizeText";

const TARGET_URLS = [
    "https://www.instagram.com/reel/DRXQt6HkbZu/"
];

// Mocking the API logic from app/api/parseSocial/route.ts
async function runDebug() {
    console.log("=== STARTING DEBUG EXTRACTION FOR MULTIPLE URLS ===");

    for (const url of TARGET_URLS) {
        console.log(`\n\n\n================================================================================`);
        console.log(`PROCESSING URL: ${url}`);
        console.log(`================================================================================`);
        await processUrl(url);
    }
}

async function processUrl(TARGET_URL: string) {
    console.log(`Target URL: ${TARGET_URL}`);

    // 1. Parse URL
    console.log("\n--- Step 1: Parse URL ---");
    const parsed = parseSocialUrl(TARGET_URL);
    console.log("Parsed:", JSON.stringify(parsed, null, 2));

    if (!parsed.isValid) {
        console.error("Invalid URL");
        return;
    }

    // 2. Fetch HTML
    console.log("\n--- Step 2: Fetch HTML ---");
    const userAgent = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

    try {
        const response = await fetch(parsed.normalizedUrl, {
            headers: {
                "User-Agent": userAgent,
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            return;
        }

        const html = await response.text();
        console.log(`Fetched HTML length: ${html.length}`);
        const $ = cheerio.load(html);

        // 3. Extract Metadata
        console.log("\n--- Step 3: Extract Metadata ---");
        let ogTitle = $('meta[property="og:title"]').attr("content") || "";
        let ogDescription = $('meta[property="og:description"]').attr("content") || "";
        let ogImage = $('meta[property="og:image"]').attr("content") || "";

        // Instagram Fallbacks
        if (parsed.platform === "instagram" && (!ogDescription || !ogTitle)) {
            const titleTag = $('title').text();
            if (titleTag && !ogTitle) ogTitle = titleTag;

            const metaDesc = $('meta[name="description"]').attr("content");
            if (metaDesc && !ogDescription) ogDescription = metaDesc;
        }

        console.log("Raw Title:", ogTitle);
        console.log("Raw Description:", ogDescription);

        // Author Extraction
        let authorName = "";
        if (parsed.platform === "instagram") {
            const titleMatch = ogTitle.match(/^(.+?) \(@/);
            if (titleMatch) {
                authorName = titleMatch[1];
            } else {
                // Try "Name on Instagram" format
                const altMatch = ogTitle.match(/^(.+?) on Instagram/);
                if (altMatch) authorName = altMatch[1];
            }
        } else if (parsed.platform === "tiktok") {
            const titleMatch = ogTitle.match(/^(.+?) \(@/);
            if (titleMatch) authorName = titleMatch[1];

            // Handle "TikTok · Author Name" format
            if (!authorName && ogTitle.startsWith("TikTok · ")) {
                authorName = ogTitle.replace("TikTok · ", "").trim();
            }
        }
        console.log("Extracted Author:", authorName);

        // 4. Language Detection & Translation
        console.log("\n--- Step 4: Language Processing ---");
        let fullText = `${ogTitle} ${ogDescription}`;
        let translatedText = fullText;
        const lngDetector = new LanguageDetect();

        const detections = lngDetector.detect(fullText, 1);
        if (detections.length > 0) {
            const detectedLanguage = detections[0][0].toLowerCase();
            console.log(`Detected Language: ${detectedLanguage}`);

            if (detectedLanguage !== "english") {
                console.log("Translating to English...");
                try {
                    const res = await translate(fullText, { to: "en" });
                    translatedText = res.text;
                    console.log("Translated Text:", translatedText);
                } catch (e) {
                    console.error("Translation failed:", e);
                }
            }
        } else {
            console.log("Could not detect language, assuming English/Neutral");
        }

        // 5. Normalize Text
        console.log("\n--- Step 5: Normalize Text ---");
        const cleanText = normalizeText(translatedText, authorName);
        console.log("Cleaned Text:", cleanText);

        // 6. Extract Candidates
        console.log("\n--- Step 6: Extract Candidates ---");
        const candidates = extractSolanaCandidates(cleanText);
        console.log(`Found ${candidates.length} candidates:`);
        candidates.forEach(c => {
            console.log(`- [${c.confidence}] ${c.normalized} (Source: ${c.source}, Raw: "${c.raw}")`);
        });

        // 7. Dexscreener Search & Filtering
        console.log("\n--- Step 7: Dexscreener Search & Filtering ---");
        const coinsMap = new Map<string, DexscreenerCoin>();

        for (const candidate of candidates) {
            console.log(`\nProcessing Candidate: "${candidate.normalized}" (Conf: ${candidate.confidence})`);
            const query = candidate.normalized;
            const results = await searchSolanaByQuery(query);
            console.log(`  Found ${results.length} raw results from Dexscreener`);

            if (results.length > 0) {
                console.log(`  Top result: ${results[0].baseToken.symbol} (${results[0].baseToken.name}) - Liq: $${results[0].liquidity?.usd}`);
            }

            // Apply Filtering Logic
            if (candidate.confidence < 5) {
                const filtered = results.filter(coin => {
                    const q = query.toLowerCase();
                    const symbol = coin.baseToken.symbol.toLowerCase();
                    const name = coin.baseToken.name.toLowerCase();

                    // SOFT BLOCK CHECK
                    if (candidate.confidence === 0.5) {
                        const isExactSymbol = symbol === q;
                        const hasHighLiq = (coin.liquidity?.usd || 0) > 100000;
                        const pass = isExactSymbol && hasHighLiq;
                        if (!pass) console.log(`    Filtered out ${symbol}: Soft Block (Exact: ${isExactSymbol}, HighLiq: ${hasHighLiq})`);
                        return pass;
                    }

                    // Normal Low Confidence Check
                    const pass = symbol === q || name.startsWith(q);
                    if (!pass) console.log(`    Filtered out ${symbol}: Low Conf Mismatch (Symbol: ${symbol}, Query: ${q})`);
                    return pass;
                });

                console.log(`  Kept ${filtered.length} after filtering`);

                const finalConfidence = candidate.confidence === 0.5 ? 7 : candidate.confidence;
                filtered.forEach(c => {
                    const existing = coinsMap.get(c.pairAddress);
                    if (!existing || finalConfidence > (existing.matchConfidence || 0)) {
                        coinsMap.set(c.pairAddress, { ...c, matchConfidence: finalConfidence });
                    }
                });
            } else {
                console.log(`  High confidence candidate, keeping all ${results.length} results (capped by search limit)`);
                results.forEach(c => {
                    const existing = coinsMap.get(c.pairAddress);
                    if (!existing || candidate.confidence > (existing.matchConfidence || 0)) {
                        coinsMap.set(c.pairAddress, { ...c, matchConfidence: candidate.confidence });
                    }
                });
            }
        }

        // 8. Final Results
        console.log("\n--- Step 8: Final Results ---");
        const allCoins = Array.from(coinsMap.values()).sort((a, b) => {
            const confDiff = (b.matchConfidence || 0) - (a.matchConfidence || 0);
            if (confDiff !== 0) return confDiff;
            return (b.fdv || 0) - (a.fdv || 0);
        });

        if (allCoins.length === 0) {
            console.log("No coins found.");
        } else {
            allCoins.forEach(coin => {
                console.log(`\nToken: ${coin.baseToken.name} ($${coin.baseToken.symbol})`);
                console.log(`Address: ${coin.pairAddress}`);
                console.log(`Confidence: ${coin.matchConfidence}`);
                console.log(`FDV: $${coin.fdv}`);
                console.log(`Liquidity: $${coin.liquidity?.usd}`);
                console.log(`URL: ${coin.url}`);
            });
        }

    } catch (error) {
        console.error("Error during debug run:", error);
    }
}

runDebug();
