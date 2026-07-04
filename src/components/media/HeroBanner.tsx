// Cinematic Hero Banner displaying a featured movie, auto-playing video trailer previews, and playback toggles.
"use client";

import React, { useEffect, useState } from "react";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import Button from "../ui/button";
import { MediaItem, Video } from "@/lib/services/mockData";
import { tmdbService, getImagePath } from "@/lib/services/tmdb";
import { useDetailModalStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface HeroBannerProps {
  featured: MediaItem;
}

export default function HeroBanner({ featured }: HeroBannerProps) {
  const router = useRouter();
  const { openDetailModal } = useDetailModalStore();
  const [trailer, setTrailer] = useState<Video | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    async function loadTrailer() {
      try {
        const vids = await tmdbService.getVideos(String(featured.id), featured.media_type);
        const trail = vids.find((v) => v.type === "Trailer" || v.type === "Teaser") || vids[0];
        if (trail) setTrailer(trail);
      } catch (err) {
        console.error("Failed to load hero trailer", err);
      }
    }
    loadTrailer();
  }, [featured]);

  // Autoplay trailer after 3.5 seconds
  useEffect(() => {
    if (!trailer) return;
    const timer = setTimeout(() => {
      setIsPlayingTrailer(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [trailer, featured]);

  const handlePlayClick = () => {
    router.push(`/watch/${featured.media_type}/${featured.id}`);
  };

  return (
    <div className="relative w-full h-[65vh] sm:h-[80vh] md:h-[88vh] bg-zinc-950 flex flex-col justify-end overflow-hidden">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {isPlayingTrailer && trailer ? (
          <div className="w-full h-full scale-[1.35] origin-center relative">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${
                isMuted ? "1" : "0"
              }&controls=0&loop=1&playlist=${trailer.key}&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0`}
              title="Hero Background Trailer"
              className="w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media"
            />
            {/* Click/interaction blocker */}
            <div className="absolute inset-0" />
          </div>
        ) : (
          <img
            src={getImagePath(featured.backdrop_path, "original")}
            alt={featured.title || featured.name}
            className="w-full h-full object-cover object-top transition-transform duration-[6s] hover:scale-105"
          />
        )}
        
        {/* Layered mask filters */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/20 to-transparent z-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-transparent z-10" />
      </div>

      {/* Info Content overlay */}
      <div className="relative z-20 max-w-3xl px-6 sm:px-12 md:px-16 pb-20 sm:pb-28 md:pb-36 text-left space-y-4">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-none text-glow uppercase">
          {featured.title || featured.name}
        </h1>

        {featured.tagline && (
          <p className="text-rose-500 font-black tracking-wide text-xs sm:text-sm md:text-base uppercase bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full inline-block">
            {featured.tagline}
          </p>
        )}

        <p className="text-zinc-200 text-sm sm:text-base md:text-lg max-w-xl line-clamp-3 leading-relaxed shadow-sm font-medium drop-shadow-lg">
          {featured.overview}
        </p>

        {/* Action Button Tray */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3.5">
            <Button variant="primary" onClick={handlePlayClick} className="px-8 py-3.5 text-sm sm:text-base">
              <Play className="h-5 w-5 fill-current mr-2" />
              Play Now
            </Button>
            
            <Button
              variant="glass"
              onClick={() => openDetailModal(String(featured.id), featured.media_type)}
              className="px-6 py-3.5 text-sm sm:text-base"
            >
              <Info className="h-5 w-5 mr-2" />
              More Info
            </Button>
          </div>

          {/* Sound Toggle (for background video playing) */}
          {isPlayingTrailer && trailer && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="mr-6 sm:mr-12 md:mr-16 p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700/50 text-white transition-all scale-100 hover:scale-110 cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
