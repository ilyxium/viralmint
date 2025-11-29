export function normalizeText(text: string, authorName?: string): string {
    let cleanText = text;

    // 1. Remove Author Name (Strict Exclusion)
    if (authorName) {
        // Create variations to remove
        const variations = [
            authorName,
            authorName.replace(/[^a-zA-Z0-9]/g, ""), // Alphanumeric only
            authorName.replace(/\s+/g, ""), // No spaces
        ];

        // Also split by spaces, underscores, and dots, and remove individual parts if they are significant (len > 2)
        const parts = authorName.split(/[\s_\.]+/).filter(p => p.length > 2);
        variations.push(...parts);

        // Remove duplicates
        const uniqueVariations = Array.from(new Set(variations));

        // Remove from text (Case Insensitive)
        for (const variation of uniqueVariations) {
            if (!variation) continue;
            // Escape regex special characters
            const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Remove whole words or significant chunks
            const regex = new RegExp(escaped, 'gi');
            cleanText = cleanText.replace(regex, " ");
        }
    }

    // 2. Normalize Whitespace and Hyphens
    cleanText = cleanText.replace(/-/g, " ").replace(/\s+/g, " ").trim();

    return cleanText;
}
