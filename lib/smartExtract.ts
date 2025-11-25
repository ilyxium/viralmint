import nlp from "compromise";

// A list of very common English nouns/words that we should IGNORE even if they are nouns.
// We want to find "Quarter Zip" or "Rizz", not "Time" or "People".
const COMMON_ENGLISH_WORDS = new Set([
    "time", "year", "people", "way", "day", "man", "thing", "woman", "life", "child", "world", "school", "state", "family", "student", "group", "country", "problem", "hand", "part", "place", "case", "week", "company", "system", "program", "question", "work", "government", "number", "night", "point", "home", "water", "room", "mother", "area", "money", "story", "fact", "month", "lot", "right", "study", "book", "eye", "job", "word", "business", "issue", "side", "kind", "head", "house", "service", "friend", "father", "power", "hour", "game", "line", "end", "member", "law", "car", "city", "community", "name", "president", "team", "minute", "idea", "kid", "body", "information", "back", "parent", "face", "others", "level", "office", "door", "health", "person", "art", "war", "history", "party", "result", "change", "morning", "reason", "research", "girl", "guy", "moment", "air", "teacher", "force", "education",
    "fashion", "style", "trend", "video", "content", "post", "comment", "share", "like", "follow", "view", "profile", "account", "realm", "encounter", "convergence", "merge", "onlookers", "styles", "sense", "convergence", "unexpected", "showcase"
]);

export function smartExtract(text: string): string[] {
    const doc = nlp(text);

    // Extract Nouns and Noun Phrases
    // e.g. "quarter zips", "rizz", "sense of style"
    const nouns = doc.nouns().out('array');

    const candidates: string[] = [];

    for (const noun of nouns) {
        const clean = noun.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

        // Skip if empty or too short
        if (clean.length < 3) continue;

        // Skip if it's a single common word
        if (!clean.includes(" ") && COMMON_ENGLISH_WORDS.has(clean)) {
            continue;
        }

        // Skip if it's just a number
        if (/^\d+$/.test(clean)) continue;

        // If it's a phrase (has space), we are more permissive.
        // "quarter zips" -> Keep
        // "unexpected encounter" -> "encounter" is common, but the phrase might be unique.
        // However, "unexpected encounter" is likely noise.
        // Let's filter if the HEAD of the noun phrase is common?
        // For now, let's just allow phrases but maybe filter known bad ones.

        candidates.push(clean);
    }

    return candidates;
}
