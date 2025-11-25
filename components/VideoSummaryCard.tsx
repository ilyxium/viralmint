import React from "react";

type VideoSummaryCardProps = {
    meta: {
        platform: "tiktok" | "instagram" | "unknown";
        url: string;
        title?: string;
        caption?: string;
        thumbnailUrl?: string;
        authorName?: string;
    };
};

export function VideoSummaryCard({ meta }: VideoSummaryCardProps) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col sm:flex-row gap-4">
            {/* Thumbnail */}
            <div className="shrink-0 w-full sm:w-32 h-48 sm:h-32 bg-zinc-800 rounded-lg overflow-hidden relative">
                {meta.thumbnailUrl ? (
                    <img
                        src={meta.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                        No Image
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${meta.platform === "tiktok"
                                    ? "bg-pink-500/20 text-pink-400"
                                    : meta.platform === "instagram"
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-zinc-700 text-zinc-400"
                                }`}
                        >
                            {meta.platform}
                        </span>
                        {meta.authorName && (
                            <span className="text-xs text-zinc-400 truncate">
                                {meta.authorName}
                            </span>
                        )}
                    </div>

                    <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 mb-1">
                        {meta.title || "No Title"}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-3">
                        {meta.caption || "No caption available."}
                    </p>
                </div>

                <div className="mt-3">
                    <a
                        href={meta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Open original ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
