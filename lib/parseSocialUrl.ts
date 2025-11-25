export type ParsedSocialUrl = {
  platform: "tiktok" | "instagram" | "unknown";
  normalizedUrl: string;
  isValid: boolean;
  error?: string;
};

export function parseSocialUrl(url: string): ParsedSocialUrl {
  if (!url) {
    return {
      platform: "unknown",
      normalizedUrl: "",
      isValid: false,
      error: "URL is empty",
    };
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // TikTok
    if (hostname.includes("tiktok.com")) {
      return {
        platform: "tiktok",
        normalizedUrl: normalizedUrl,
        isValid: true,
      };
    }

    // Instagram
    if (hostname.includes("instagram.com")) {
      // Check for reel or post
      if (
        urlObj.pathname.includes("/reel/") ||
        urlObj.pathname.includes("/p/") ||
        urlObj.pathname.includes("/reels/")
      ) {
        return {
          platform: "instagram",
          normalizedUrl: normalizedUrl,
          isValid: true,
        };
      }
    }

    return {
      platform: "unknown",
      normalizedUrl: normalizedUrl,
      isValid: false,
      error: "Unsupported platform. Please use TikTok or Instagram.",
    };
  } catch (e) {
    return {
      platform: "unknown",
      normalizedUrl: url,
      isValid: false,
      error: "Invalid URL format",
    };
  }
}
