// Hover-scaling animated Movie/Show Card featuring quick action buttons and details modal hooks.
"use client";

import React, { useState } from "react";
import { Play, Plus, Check, Star, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getImagePath } from "@/lib/services/tmdb";
import { useDetailModalStore, useAuthModalStore, useAuthStore } from "@/lib/store";

interface MovieCardProps {
  id: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv";
  voteAverage: number;
  isTrending?: boolean;
  index?: number;
  reason?: string;
}

export default function MovieCard({
  id,
  title,
  posterPath,
  backdropPath,
  mediaType,
  voteAverage,
  isTrending,
  index,
  reason,
}: MovieCardProps) {
  const router = useRouter();
  const { openDetailModal } = useDetailModalStore();
  const { user, watchlist, addToWatchlist, removeFromWatchlist } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [isHovered, setIsHovered] = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  const inWatchlist = watchlist.some(
    (w) => w.mediaId === String(id) && w.mediaType === mediaType
  );

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal("login");
      return;
    }

    setLoadingWatchlist(true);
    const method = inWatchlist ? "DELETE" : "POST";
    const url = inWatchlist 
      ? `/api/watchlist?mediaId=${id}&mediaType=${mediaType}`
      : "/api/watchlist";
    const body = inWatchlist
      ? null
      : JSON.stringify({
          mediaId: id,
          mediaType,
          title,
          posterPath,
          backdropPath,
        });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        if (inWatchlist) {
          removeFromWatchlist(String(id), mediaType);
        } else {
          addToWatchlist({ 
            mediaId: String(id), 
            mediaType,
            title,
            posterPath: posterPath || undefined,
            backdropPath: backdropPath || undefined
          });
        }
      }
    } catch (err) {
      console.error("Watchlist edit failed", err);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/watch/${mediaType}/${id}`);
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => openDetailModal(id, mediaType)}
      className="relative flex-shrink-0 w-[140px] h-[210px] sm:w-[180px] sm:h-[270px] md:w-[220px] md:h-[330px] rounded-xl overflow-hidden cursor-pointer border border-zinc-900 bg-zinc-950/80 shadow-md transform-gpu"
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.25 }}
    >
      {/* Trending Rank Badge */}
      {isTrending && index !== undefined && (
        <div className="absolute top-2.5 left-2.5 z-30 px-2.5 py-1 bg-rose-600/90 border border-rose-500/30 rounded-xl text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider shadow-lg flex items-center space-x-1 backdrop-blur-md">
          <Flame className="h-3 w-3 fill-current text-white animate-pulse" />
          <span>#{index + 1} Trending</span>
        </div>
      )}

      {/* Poster Image */}
      <img
        src={
          posterPath && posterPath.startsWith("http")
            ? posterPath
            : `/api/imdb/poster?id=${id}&type=${mediaType}&title=${encodeURIComponent(title)}&fallback=${posterPath ? encodeURIComponent(posterPath) : ""}`
        }
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
      />

      {/* Glass Overlay details on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-3 sm:p-4"
          >
            <h4 className="text-white text-xs sm:text-sm font-extrabold tracking-tight line-clamp-1 mb-1">
              {title}
            </h4>
            
            {reason && (
              <p className="text-[9px] sm:text-[10px] text-purple-400 font-bold italic line-clamp-2 leading-tight mb-2.5">
                🔮 {reason}
              </p>
            )}
            
            <div className="flex items-center space-x-2 text-[10px] sm:text-xs font-semibold text-zinc-300 mb-2">
              <span className="text-rose-500 font-bold capitalize">{mediaType}</span>
              <span>•</span>
              <div className="flex items-center text-amber-500 font-bold">
                <Star className="h-3 w-3 fill-current mr-0.5" />
                {voteAverage?.toFixed(1) || "NR"}
              </div>
            </div>

            {/* Quick Action Button tray */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayClick}
                className="flex items-center justify-center p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg hover:scale-110 cursor-pointer"
                title="Play movie"
              >
                <Play className="h-3 w-3 sm:h-4.5 sm:w-4.5 fill-current" />
              </button>

              <button
                onClick={handleWatchlistToggle}
                disabled={loadingWatchlist}
                className="flex items-center justify-center p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white transition-all hover:scale-110 cursor-pointer"
                title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                {inWatchlist ? (
                  <Check className="h-3 w-3 sm:h-4.5 sm:w-4.5 text-rose-500 font-extrabold" />
                ) : (
                  <Plus className="h-3 w-3 sm:h-4.5 sm:w-4.5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
