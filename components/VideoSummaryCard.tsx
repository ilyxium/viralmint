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
        <div className="rounded-lg border border-decay-500 bg-[#0a0a0b] p-4 flex flex-col sm:flex-row gap-4 hover-wet glow-purple transition-all hover:border-zinc-700">
            {/* Thumbnail */}
            <div className="shrink-0 w-full sm:w-32 h-48 sm:h-32 bg-black rounded-sm overflow-hidden relative border border-decay-500">
                {meta.thumbnailUrl ? (
                    <img
                        src={meta.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-mono uppercase">
                        No Image
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm font-mono border ${meta.platform === "tiktok"
                                ? "bg-pink-900/10 text-pink-500 border-pink-500/20"
                                : meta.platform === "instagram"
                                    ? "bg-purple-900/10 text-purple-500 border-purple-500/20"
                                    : "bg-zinc-900 text-zinc-500 border-zinc-700"
                                }`}
                        >
                            {meta.platform}
                        </span>
                        {meta.authorName && (
                            <span className="text-xs text-zinc-500 truncate font-mono">
                                {meta.authorName}
                            </span>
                        )}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-2 mb-1 font-mono leading-tight">
                        {meta.title || "Untitled Transmission"}
                    </h3>

                    <p className="text-xs text-zinc-500 line-clamp-3 font-mono">
                        {meta.caption || "No caption data found."}
                    </p>
                </div>

                <div className="mt-3">
                    <a
                        href={meta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-bold text-toxic-500 hover:text-toxic-400 transition-colors uppercase font-mono tracking-wide"
                    >
                        Source Link ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
