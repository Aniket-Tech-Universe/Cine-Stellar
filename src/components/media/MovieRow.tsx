// Horizontal slide list for MovieCards with interactive scrolling buttons.
"use client";

import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import { MediaItem } from "@/lib/services/mockData";

interface MovieRowProps {
  title: string;
  items: MediaItem[];
  isTrending?: boolean;
}

export default function MovieRow({ title, items, isTrending }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);

  if (!items || items.length === 0) return null;

  const handleScroll = () => {
    if (rowRef.current) {
      setShowLeftArrow(rowRef.current.scrollLeft > 10);
    }
  };

  const slide = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      const targetScroll =
        direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;

      rowRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col space-y-2 py-4 relative group">
      <h3 className="text-lg md:text-xl font-bold text-white pl-4 md:pl-10 tracking-tight">
        {title}
      </h3>

      <div className="relative">
        {/* Left scroll control arrow */}
        {showLeftArrow && (
          <button
            onClick={() => slide("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-r from-black to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-350 cursor-pointer border-none"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="h-8 w-8 hover:scale-125 transition-transform" />
          </button>
        )}

        {/* Horizontal scroll container */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex space-x-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-4 md:px-10"
        >
          {items.map((item, idx) => (
            <MovieCard
              key={item.id}
              id={String(item.id)}
              title={item.title || item.name || ""}
              posterPath={item.poster_path}
              backdropPath={item.backdrop_path}
              mediaType={item.media_type}
              voteAverage={item.vote_average}
              isTrending={isTrending}
              index={idx}
              reason={(item as any).reason}
            />
          ))}
        </div>

        {/* Right scroll control arrow */}
        <button
          onClick={() => slide("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-l from-black to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-350 cursor-pointer border-none"
          aria-label="Scroll Right"
        >
          <ChevronRight className="h-8 w-8 hover:scale-125 transition-transform" />
        </button>
      </div>
    </div>
  );
}
