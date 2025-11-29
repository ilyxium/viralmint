import { smartExtract } from "./smartExtract";

export type CoinCandidate = {
    id: string;
    source: "mint" | "ticker" | "name" | "link";
    raw: string;
    normalized: string;
    confidence: number; // 0-10 score
    info?: {
        original?: string;
        suffix?: string;
    };
};

export function extractSolanaCandidates(text: string): CoinCandidate[] {
    const candidates = new Map<string, CoinCandidate>();

    // Helper to add candidate with score
    const addCandidate = (c: CoinCandidate) => {
        const key = c.normalized.toLowerCase();
        const existing = candidates.get(key);
        if (existing) {
            // Keep the higher confidence one
            if (c.confidence > existing.confidence) {
                candidates.set(key, c);
            }
        } else {
            candidates.set(key, c);
        }
    };

    // 1. Extract Solana mint-like addresses (High Confidence: 10)
    const mintRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    const mintMatches = text.match(mintRegex) || [];
    for (const match of mintMatches) {
        addCandidate({
            id: `mint-${match}`,
            source: "mint",
            raw: match,
            normalized: match,
            confidence: 10,
        });
    }

    // 2. Detect URLs (High Confidence: 9)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urlMatches = text.match(urlRegex) || [];
    for (const url of urlMatches) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            const pathname = urlObj.pathname.toLowerCase();

            if (
                hostname.includes("pump.fun") ||
                hostname.includes("birdeye.so") ||
                hostname.includes("jup.ag") ||
                (hostname.includes("dexscreener.com") && pathname.includes("/solana/"))
            ) {
                addCandidate({
                    id: `link-${url}`,
                    source: "link",
                    raw: url,
                    normalized: url,
                    confidence: 9,
                });
            }
        } catch (e) { }
    }

    // 3. Extract Cashtags ($TICKER) (High Confidence: 8)
    const cashtagRegex = /\$([A-Z0-9]{2,10})\b/gi;
    let match;
    while ((match = cashtagRegex.exec(text)) !== null) {
        const raw = match[0];
        const ticker = match[1].toUpperCase(); // Normalize to upper
        addCandidate({
            id: `ticker-${ticker}`,
            source: "ticker",
            raw: raw,
            normalized: ticker,
            confidence: 8,
        });
    }

    // Track hashtags for overlap check
    const foundHashtags = new Set<string>();

    // 4. Extract Hashtags (#ticker) (Medium Confidence: 6)
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    while ((match = hashtagRegex.exec(text)) !== null) {
        const tag = match[1];
        // Filter out spam tags
        const stopWords = new Set([
            // Common English Function Words
            "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
            "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
            "can", "can't", "cannot", "could", "couldn't",
            "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
            "each", "few", "for", "from", "further",
            "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
            "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
            "let's", "me", "more", "most", "mustn't", "my", "myself",
            "no", "nor", "not",
            "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
            "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
            "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
            "under", "until", "up",
            "very",
            "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
            "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",

            // Social & Spam
            "motivation", "motivationalquotes", "inspiration", "success", "goals", "entrepreneur", "entreprenuer", "mindset", "grind", "hustle", "quotes", "daily",
            "laugh", "humor", "joke", "prank", "challenge", "dance", "music", "song", "sound", "original",
            "fashion", "style", "outfit", "wear", "trend", "performative", "matcha", "postit", "mensfashion", "outfitinspo",
            "fyp", "foryou", "viral", "trending", "explore", "meme", "memes", "funny", "comedy", "lol", "lmao", "pov",
            "crypto", "solana", "bitcoin", "ethereum", "nft", "coins", "token", "tokens", "money", "finance", "invest",
            "video", "watch", "view", "like", "share", "comment", "follow", "subscribe", "profile", "account", "post", "reel"
        ]);

        if (!stopWords.has(tag.toLowerCase())) {
            foundHashtags.add(tag.toLowerCase());
            addCandidate({
                id: `hashtag-${tag}`,
                source: "name", // Treat as name for search
                raw: match[0],
                normalized: tag,
                confidence: 6,
            });
        }
    }

    // 5. Extract Capitalized Words (Low Confidence: 2)
    // We only want to do this if we haven't found high confidence signals? 
    // No, let's collect them and let the ranker decide.
    // Helper to singularize
    const singularize = (word: string) => {
        if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
            return word.slice(0, -1);
        }
        return word;
    };

    // 5. Extract Capitalized Words (Low Confidence: 2) & N-Grams
    // 5. Extract Capitalized Words (Low Confidence: 2) & N-Grams
    const words = text.split(/\s+/);

    // Detect "Shouting Sequences" (3+ Uppercase words in a row)
    // If a word is part of a shouting sequence, we downgrade it.
    const shoutingIndices = new Set<number>();
    let sequenceStart = -1;
    for (let i = 0; i < words.length; i++) {
        const clean = words[i].replace(/[^a-zA-Z0-9]/g, "");

        // Skip symbols/punctuation in sequence detection
        if (clean.length === 0) continue;

        const isCap = /^[A-Z0-9]+$/.test(clean) && clean.length > 1 && !/^[0-9]+$/.test(clean);

        if (isCap) {
            if (sequenceStart === -1) sequenceStart = i;
        } else {
            if (sequenceStart !== -1) {
                if (i - sequenceStart >= 3) {
                    for (let k = sequenceStart; k < i; k++) shoutingIndices.add(k);
                }
                sequenceStart = -1;
            }
        }
    }
    // Handle sequence at the end
    if (sequenceStart !== -1 && words.length - sequenceStart >= 3) {
        for (let k = sequenceStart; k < words.length; k++) shoutingIndices.add(k);
    }

    // HARD BLOCK: Never search for these. Pure noise.
    const HARD_BLOCK = new Set([
        "THE", "AND", "FOR", "BUT", "NOT", "YES", "YOU", "ARE", "CAN", "SEE", "NEW", "NOW", "BUY", "SELL", "SOL", "USD", "USDC", "USDT",
        "VIDEO", "CAPTION", "INSTAGRAM", "TIKTOK", "POST", "COMMENT", "SHARE", "FOLLOW", "SUBSCRIBE", "PROFILE", "ACCOUNT", "MY", "YOUR", "HIS", "HER", "ITS", "OUR", "THEIR",
        "THIS", "THAT", "WHAT", "WHY", "HOW", "WHO", "WHEN", "WHERE", "WHICH", "JUST", "MAKE", "MADE", "LIKE",
        "WATCH", "DISCOVER", "VISIT", "TRENDING", "CONTENT", "VIDEOS", // Generic TikTok/Instagram terms
        "FROM", "TO", "WITH", "WILL", "TURN", "TOUCH", "IN", "ON", "AT", "BY", "OF", "OFF", "UP", "DOWN", // Prepositions & Verbs
        "JOIN", "NOTHING", "STYLE", "FASHION", "HAND", "BEATS", "FIT", "FITS", "BLEND", "COMFORT", "PERFECT" // Common words from debug session
    ]);

    // SOFT BLOCK: Search, but require EXACT SYMBOL MATCH + HIGH LIQUIDITY.
    // These are common words that *could* be tokens (e.g. "Time", "Life", "Lock").
    const SOFT_BLOCK = new Set([
        "TIME", "YEAR", "PEOPLE", "WAY", "DAY", "MAN", "THING", "WOMAN", "LIFE", "CHILD", "WORLD", "SCHOOL", "STATE", "FAMILY", "STUDENT", "GROUP", "COUNTRY", "PROBLEM", "HAND", "PART", "PLACE", "CASE", "WEEK", "COMPANY", "SYSTEM", "PROGRAM", "QUESTION", "WORK", "GOVERNMENT", "NUMBER", "NIGHT", "POINT", "HOME", "WATER", "ROOM", "MOTHER", "AREA", "MONEY", "STORY", "FACT", "MONTH", "LOT", "RIGHT", "STUDY", "BOOK", "EYE", "JOB", "WORD", "BUSINESS", "ISSUE", "SIDE", "KIND", "HEAD", "HOUSE", "SERVICE", "FRIEND", "FATHER", "POWER", "HOUR", "GAME", "LINE", "END", "MEMBER", "LAW", "CAR", "CITY", "COMMUNITY", "NAME", "PRESIDENT", "TEAM", "MINUTE", "IDEA", "KID", "BODY", "INFORMATION", "BACK", "PARENT", "FACE", "OTHERS", "LEVEL", "OFFICE", "DOOR", "HEALTH", "PERSON", "ART", "WAR", "HISTORY", "PARTY", "RESULT", "CHANGE", "CHANGED", "MORNING", "REASON", "RESEARCH", "GIRL", "GUY", "MOMENT", "AIR", "TEACHER", "FORCE", "EDUCATION",
        "MOVEMENT", "GOOD", "BAD", "GREAT", "BEST", "REAL", "FAKE", "TRUE", "FALSE", "LEFT", "UP", "DOWN", "HIGH", "LOW", "BIG", "SMALL", "LONG", "SHORT", "OLD", "YOUNG", "FIRST", "LAST", "NEXT", "PREVIOUS", "SAME", "DIFFERENT", "OWN", "OTHER", "ANOTHER", "SUCH", "MANY", "MUCH", "MORE", "MOST", "FEW", "LESS", "LEAST", "ALL", "ANY", "SOME", "NO", "NONE", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"
    ]);

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const clean = word.replace(/[^a-zA-Z0-9]/g, "");

        // Allow 2-char words if they are numbers (e.g. "67") or uppercase (tickers)
        // Otherwise require 3 chars to avoid noise like "is", "to", "at"
        if (clean.length < 2) continue;
        if (clean.length === 2 && !/^[0-9]+$/.test(clean) && !/^[A-Z]+$/.test(clean)) continue;

        // Filter out Metrics (e.g. 37M, 22K, 1.5B)
        if (/^\d+(\.\d+)?[MK]$/.test(clean)) continue;

        // Filter out Dates (Months, Years, Full Dates)
        const MONTHS = new Set(["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER", "JAN", "FEB", "MAR", "APR", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]);
        if (MONTHS.has(clean.toUpperCase())) continue;
        // Year check (1990-2030) - strict check to avoid blocking "2025" if it's part of a coin name, but here we are checking single words.
        // Actually, "2025" is likely a year in most contexts. Let's block standalone years.
        if (/^(19|20)\d{2}$/.test(clean)) continue;

        // Check for All Caps or Title Case
        const isAllCaps = /^[A-Z0-9]+$/.test(clean);
        const isTitleCase = /^[A-Z][a-z]+$/.test(clean);
        const isNumber = /^[0-9]+$/.test(clean);

        if (isAllCaps || isTitleCase || isNumber) {
            let confidence = isAllCaps ? 3 : 2;
            if (isNumber) confidence = 4; // High confidence for explicit numbers like "67" in a meme context

            // Downgrade confidence if shouting
            if (shoutingIndices.has(i) && isAllCaps && !isNumber) {
                confidence = 0.5; // Treat as Soft Block (Strict Filter)
            }

            const upperClean = clean.toUpperCase();

            // HARD BLOCK CHECK
            if (HARD_BLOCK.has(upperClean)) {
                continue;
            }

            // SOFT BLOCK CHECK
            if (SOFT_BLOCK.has(upperClean)) {
                confidence = 0.5;
            }

            // Overlap Boost overrides Soft Block
            if (foundHashtags.has(clean.toLowerCase())) {
                confidence = 8;
            } else {
                const singular = singularize(clean.toLowerCase());
                if (foundHashtags.has(singular)) {
                    confidence = 8;
                }
            }

            addCandidate({
                id: `word-${clean}`,
                source: "name",
                raw: word,
                normalized: clean,
                confidence: confidence,
            });

            // Add Singular Version if different
            const singular = singularize(clean);
            if (singular !== clean) {
                addCandidate({
                    id: `word-${singular}`,
                    source: "name",
                    raw: word,
                    normalized: singular,
                    confidence: confidence,
                });
            }

            // --- N-Gram Extraction (2-3 words) ---
            if (i + 1 < words.length) {
                const nextWord = words[i + 1];
                const nextClean = nextWord.replace(/[^a-zA-Z0-9]/g, "");
                const nextIsCap = /^[A-Z0-9]+$/.test(nextClean) || /^[A-Z][a-z]+$/.test(nextClean);

                if (nextIsCap && nextClean.length > 1) {
                    // Check against HARD BLOCK
                    const isFirstHard = HARD_BLOCK.has(clean.toUpperCase());
                    const isSecondHard = HARD_BLOCK.has(nextClean.toUpperCase());

                    if (!isFirstHard && !isSecondHard) {
                        // Check against SOFT BLOCK (Taint Check)
                        const isFirstSoft = SOFT_BLOCK.has(clean.toUpperCase());
                        const isSecondSoft = SOFT_BLOCK.has(nextClean.toUpperCase());
                        const isTainted = isFirstSoft || isSecondSoft;

                        // Found 2-word phrase
                        const phrase2 = `${clean} ${nextClean}`;
                        addCandidate({
                            id: `phrase-${phrase2.replace(/\s/g, '-')}`,
                            source: "name",
                            raw: `${word} ${nextWord}`,
                            normalized: phrase2,
                            confidence: isTainted ? 0.5 : 4, // Downgrade if tainted
                        });

                        // Look ahead one more (3-word phrase)
                        if (i + 2 < words.length) {
                            const nextNextWord = words[i + 2];
                            const nextNextClean = nextNextWord.replace(/[^a-zA-Z0-9]/g, "");
                            const nextNextIsCap = /^[A-Z0-9]+$/.test(nextNextClean) || /^[A-Z][a-z]+$/.test(nextNextClean);
                            const isThirdHard = HARD_BLOCK.has(nextNextClean.toUpperCase());

                            if (nextNextIsCap && nextNextClean.length > 1 && !isThirdHard) {
                                const isThirdSoft = SOFT_BLOCK.has(nextNextClean.toUpperCase());
                                const isTainted3 = isTainted || isThirdSoft;

                                const phrase3 = `${clean} ${nextClean} ${nextNextClean}`;
                                addCandidate({
                                    id: `phrase-${phrase3.replace(/\s/g, '-')}`,
                                    source: "name",
                                    raw: `${word} ${nextWord} ${nextNextWord}`,
                                    normalized: phrase3,
                                    confidence: isTainted3 ? 0.5 : 5, // Downgrade if tainted
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 6. Smart Extraction (NLP for Noun Phrases) (Low Confidence: 1)
    // This catches "quarter zips" or "rizz" even if lowercase.
    // We rely on the "Strict Matching" or "High Liquidity" filter to remove noise.
    const smartCandidates = smartExtract(text);
    for (const candidate of smartCandidates) {
        // Only add if not already present (higher confidence wins via addCandidate logic)
        addCandidate({
            id: `smart-${candidate.replace(/\s/g, '-')}`,
            source: "name",
            raw: candidate,
            normalized: candidate, // Keep original casing (likely lowercase)
            confidence: 1,
        });
    }

    // Filter candidates against HARD_BLOCK (Double check for Smart Extract and others)
    for (const [key, candidate] of candidates) {
        const upper = candidate.normalized.toUpperCase();
        // Check single words
        if (HARD_BLOCK.has(upper)) {
            candidates.delete(key);
            continue;
        }
        // Check words within phrases
        const parts = upper.split(/[\s-]+/);
        if (parts.some(p => HARD_BLOCK.has(p))) {
            // If a phrase contains a hard blocked word, we should probably be careful.
            // For now, let's just delete it if it's a "smart" candidate or low confidence
            if (candidate.confidence < 5) {
                candidates.delete(key);
                continue;
            }
        }

        // Check for Date Phrases (e.g. "November 26", "November 26 2025")
        const MONTHS = new Set(["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER", "JAN", "FEB", "MAR", "APR", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]);
        const hasMonth = parts.some(p => MONTHS.has(p));
        const hasYear = parts.some(p => /^(19|20)\d{2}$/.test(p));
        const hasDay = parts.some(p => /^\d{1,2}$/.test(p));

        if (hasMonth && (hasDay || hasYear)) {
            candidates.delete(key);
            continue;
        }
    }

    // 7. Fallback: Lowercase N-Grams (2-3 words)
    // If we haven't found any strong signals (Conf >= 5), try to find common phrases even if lowercase.
    // e.g. "quarter zip", "chill guy"
    const hasStrongCandidates = Array.from(candidates.values()).some(c => c.confidence >= 5);
    if (!hasStrongCandidates) {
        const lowerWords = text.toLowerCase().split(/\s+/);
        for (let i = 0; i < lowerWords.length - 1; i++) {
            const w1 = lowerWords[i].replace(/[^a-z0-9]/g, "");
            const w2 = lowerWords[i + 1].replace(/[^a-z0-9]/g, "");

            if (w1.length < 3 || w2.length < 3) continue;
            if (HARD_BLOCK.has(w1.toUpperCase()) || HARD_BLOCK.has(w2.toUpperCase())) continue;

            // 2-word phrase
            const phrase2 = `${w1} ${w2}`;
            addCandidate({
                id: `phrase-lower-${phrase2.replace(/\s/g, '-')}`,
                source: "name",
                raw: phrase2,
                normalized: phrase2,
                confidence: 1.5 // Low confidence, but enough to be searched if nothing else exists
            });

            // 3-word phrase
            if (i + 2 < lowerWords.length) {
                const w3 = lowerWords[i + 2].replace(/[^a-z0-9]/g, "");
                if (w3.length >= 3 && !HARD_BLOCK.has(w3.toUpperCase())) {
                    const phrase3 = `${w1} ${w2} ${w3}`;
                    addCandidate({
                        id: `phrase-lower-${phrase3.replace(/\s/g, '-')}`,
                        source: "name",
                        raw: phrase3,
                        normalized: phrase3,
                        confidence: 1.5
                    });
                }
            }
        }
    }

    return Array.from(candidates.values());
}
