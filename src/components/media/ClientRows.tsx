// Client-side personalized movie sliders for Continue Watching, My List, and dynamic recommendations.
"use client";

import React, { useEffect, useState } from "react";
import { Play, Trash2, Heart } from "lucide-react";
import MovieRow from "./MovieRow";
import { useAuthStore, useDetailModalStore } from "@/lib/store";
import { MediaItem } from "@/lib/services/mockData";
import { useRouter } from "next/navigation";
import { getImagePath } from "@/lib/services/tmdb";

export default function ClientRows() {
  const { user, watchlist } = useAuthStore();
  const { openDetailModal } = useDetailModalStore();
  const router = useRouter();

  const [history, setHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  // Map to standard MediaItem structure
  const watchlistItems = watchlist.map((w: any) => ({
    id: w.mediaId,
    title: w.title || "",
    poster_path: w.posterPath || "",
    backdrop_path: w.backdropPath || "",
    media_type: w.mediaType as "movie" | "tv",
    vote_average: 0,
    genre_ids: [],
    popularity: 0,
    overview: "",
  }));

  useEffect(() => {
    if (!user) return;

    async function loadClientData() {
      try {
        // Fetch watch history only
        const histRes = await fetch("/api/history");

        if (histRes.ok) {
          const data = await histRes.json();
          setHistory(data.watchHistory);
          
          // Generate recommendations dynamically based on watched history genres/titles
          if (data.watchHistory.length > 0) {
            // Dynamic recommendation fallback pool
            const sampleRecs = [
              {
                id: "157336",
                title: "Interstellar",
                overview: "A journey through space and time.",
                backdrop_path: "/xJHokDu8GoCvOK56v41nuPj4v6r.jpg",
                poster_path: "/gEU2QvH3ICfg7v1o5bZ2eC14LL1.jpg",
                media_type: "movie" as const,
                genre_ids: [12, 18, 878],
                vote_average: 8.4,
                popularity: 100,
              },
              {
                id: "27205",
                title: "Inception",
                overview: "Dream infiltration and heist.",
                backdrop_path: "/8ZgRnsn52C6z4amC59TTzsCj5u.jpg",
                poster_path: "/o0solCr486IHI7Rg2u4hQ1yYrDO.jpg",
                media_type: "movie" as const,
                genre_ids: [28, 878, 12],
                vote_average: 8.4,
                popularity: 100,
              },
              {
                id: "66732",
                title: "Stranger Things",
                name: "Stranger Things",
                overview: "Supernatural mysteries in Hawkins.",
                backdrop_path: "/56v2Kj2Fa6Ir7n46VNMszuKiKiB.jpg",
                poster_path: "/49WJfeN0mhmZuuRjFjV60wfvKG6.jpg",
                media_type: "tv" as const,
                genre_ids: [10765, 18, 9648],
                vote_average: 8.6,
                popularity: 100,
              }
            ];
            // Filter out already watched items
            const filteredRecs = sampleRecs.filter(
              (rec) => !data.watchHistory.some((h: any) => h.mediaId === rec.id)
            );
            setRecommendations(filteredRecs);
          }
        }

        // Fetch Gemini AI recommendations
        const aiRes = await fetch("/api/recommendations/ai");
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiRecommendations(aiData.recommendations || []);
        }
      } catch (err) {
        console.error("Failed to load client row assets:", err);
      }
    }

    loadClientData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* 1. Continue Watching Row (custom progress-card layout) */}
      {history && history.length > 0 && (
        <div className="flex flex-col space-y-2 py-4 pl-4 md:pl-10">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Continue Watching
          </h3>
          <div className="flex space-x-4 overflow-x-auto no-scrollbar py-3 pr-4">
            {history.map((item) => {
              const progressPercentage = Math.min(100, Math.max(0, (item.progress / item.duration) * 100));
              return (
                <div
                  key={item.id}
                  onClick={() => openDetailModal(item.mediaId, item.mediaType)}
                  className="relative flex-shrink-0 w-[200px] h-[115px] sm:w-[260px] sm:h-[150px] rounded-xl overflow-hidden cursor-pointer border border-zinc-900 bg-zinc-900 group shadow-lg"
                >
                  <img
                    src={getImagePath(item.backdropPath, "w500")}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/watch/${item.mediaType}/${item.mediaId}`);
                      }}
                      className="p-3 rounded-full bg-rose-600 text-white shadow-xl scale-90 group-hover:scale-100 transition-transform cursor-pointer"
                    >
                      <Play className="h-5 w-5 fill-current" />
                    </button>
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-left">
                    <p className="text-xs sm:text-sm font-black text-white truncate drop-shadow-md">
                      {item.title}
                    </p>
                    {item.season && (
                      <p className="text-[10px] text-rose-500 font-bold drop-shadow">
                        S{item.season} : E{item.episode}
                      </p>
                    )}
                  </div>

                  {/* Red progress line bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800">
                    <div
                      className="h-full bg-rose-600 transition-all duration-350"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. My List Row */}
      {watchlistItems && watchlistItems.length > 0 && (
        <MovieRow title="My List" items={watchlistItems} />
      )}

      {/* 2.5 Gemini AI Recommendations Row */}
      {aiRecommendations && aiRecommendations.length > 0 && (
        <MovieRow title="🔮 Gemini AI Recommendations" items={aiRecommendations} />
      )}

      {/* 3. Recommended Row */}
      {recommendations && recommendations.length > 0 && (
        <MovieRow title="Recommended For You" items={recommendations} />
      )}
    </div>
  );
}
