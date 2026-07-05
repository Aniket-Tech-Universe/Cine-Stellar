// Immersive media discovery page with filter selectors (by genre, year, language, sort order) and infinite load results.
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, SlidersHorizontal, Loader } from "lucide-react";
import Button from "@/components/ui/button";
import MovieCard from "@/components/media/MovieCard";
import { tmdbService } from "@/lib/services/tmdb";
import { MediaItem } from "@/lib/services/mockData";

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as "movie" | "tv" | null;
  const genreParam = searchParams.get("genre");

  // Filter states
  const [mediaType, setMediaType] = useState<"movie" | "tv">(typeParam || "movie");
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(genreParam || "");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("popularity.desc");

  // Listing results states
  const [results, setResults] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync media type and genre from query param if changed
  useEffect(() => {
    if (typeParam) {
      setMediaType(typeParam);
    }
    if (genreParam) {
      setSelectedGenre(genreParam);
    } else {
      setSelectedGenre("");
    }
    setPage(1);
    setResults([]);
  }, [typeParam, genreParam]);

  // Load genres
  useEffect(() => {
    async function fetchGenres() {
      try {
        const list = await tmdbService.getGenres(mediaType);
        setGenres(list);
      } catch (err) {
        console.error("Failed to load genres list", err);
      }
    }
    fetchGenres();
  }, [mediaType]);

  // Query media list based on filters
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await tmdbService.discover(mediaType, {
          with_genres: selectedGenre || undefined,
          primary_release_year: mediaType === "movie" ? selectedYear || undefined : undefined,
          first_air_date_year: mediaType === "tv" ? selectedYear || undefined : undefined,
          with_original_language: selectedLanguage || undefined,
          sort_by: sortBy,
          page: 1,
        });
        setResults(data.results);
        setTotalPages(data.total_pages);
        setPage(1);
      } catch (err) {
        console.error("Failed to discover media", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [mediaType, selectedGenre, selectedYear, selectedLanguage, sortBy]);

  // Load more pages
  const handleLoadMore = async () => {
    if (page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await tmdbService.discover(mediaType, {
        with_genres: selectedGenre || undefined,
        primary_release_year: mediaType === "movie" ? selectedYear || undefined : undefined,
        first_air_date_year: mediaType === "tv" ? selectedYear || undefined : undefined,
        with_original_language: selectedLanguage || undefined,
        sort_by: sortBy,
        page: nextPage,
      });
      setResults((prev) => [...prev, ...data.results]);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const years = Array.from({ length: 25 }, (_, i) => String(2026 - i));
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "de", name: "German" },
  ];

  return (
    <div className="w-full min-h-screen bg-zinc-950 pt-28 pb-20 px-4 sm:px-8 md:px-12 flex flex-col text-left">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-850 pb-5 gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center space-x-2">
              <SlidersHorizontal className="h-7 w-7 text-rose-500" />
              <span>DISCOVER</span>
            </h2>
            <p className="text-zinc-400 text-sm">
              Filter through global libraries to find your next cinematic obsession.
            </p>
          </div>

          {/* Toggle Media Type */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-full w-fit">
            <button
              onClick={() => {
                setMediaType("movie");
                setSelectedGenre("");
              }}
              className={`px-5 py-2 text-xs font-extrabold rounded-full transition-all focus:outline-none cursor-pointer ${
                mediaType === "movie"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => {
                setMediaType("tv");
                setSelectedGenre("");
              }}
              className={`px-5 py-2 text-xs font-extrabold rounded-full transition-all focus:outline-none cursor-pointer ${
                mediaType === "tv"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              TV Shows
            </button>
          </div>
        </div>

        {/* Filters Controls Panel */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850">
          {/* Genre select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
              Genre
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Language select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="">All Languages</option>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By select */}
          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Newest Releases</option>
            </select>
          </div>
        </div>

        {/* Results Grid display */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader className="h-10 w-10 animate-spin text-rose-600" />
            <p className="text-sm text-zinc-500 font-medium">Filtering libraries...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((item) => (
                <div key={item.id} className="flex justify-center">
                  <MovieCard
                    id={String(item.id)}
                    title={item.title || item.name || ""}
                    posterPath={item.poster_path}
                    backdropPath={item.backdrop_path}
                    mediaType={mediaType}
                    voteAverage={item.vote_average}
                  />
                </div>
              ))}
            </div>

            {/* Load More Trigger Button */}
            {page < totalPages && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="glass"
                  onClick={handleLoadMore}
                  isLoading={loadingMore}
                  className="px-8 py-3 bg-zinc-900 border border-zinc-800"
                >
                  Load More Titles
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-28 space-y-2">
            <p className="text-lg font-bold text-zinc-300">No content matches your filters</p>
            <p className="text-sm text-zinc-500">Try adjusting your genre, year, or sort configs.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4 text-zinc-400">
        <Loader className="h-10 w-10 animate-spin text-rose-600" />
        <p className="text-sm font-medium">Loading discovery libraries...</p>
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
