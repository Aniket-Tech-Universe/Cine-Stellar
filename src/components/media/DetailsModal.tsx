// Cinematic full-screen details overlay with tabbed layout, rich metadata from TMDB + IMDb
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Play, Plus, Check, Star, Heart, Share2, X,
  Film, Globe, Calendar, Clock, Award, Users,
  ChevronRight, BookOpen, Clapperboard, Image as ImageIcon, Tv,
  ExternalLink, ThumbsUp, Info, Loader
} from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import Button from "../ui/button";
import { useDetailModalStore, useAuthModalStore, useAuthStore } from "@/lib/store";
import { tmdbService, getImagePath } from "@/lib/services/tmdb";
import { useRouter } from "next/navigation";
import { Skeleton } from "../ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImdbData {
  imdbId?: string;
  imdbUrl?: string;
  rating?: number;
  voteCount?: number;
  metacriticScore?: number;
  metacriticCount?: number;
  interests?: string[];
  posterUrl?: string;
}

type TabId = "overview" | "episodes" | "details" | "media" | "more";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",       icon: <Info className="w-3.5 h-3.5" /> },
  { id: "episodes",  label: "Episodes",       icon: <Tv className="w-3.5 h-3.5" /> },
  { id: "details",   label: "Details",        icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "media",     label: "Media",          icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { id: "more",      label: "More Like This", icon: <Film className="w-3.5 h-3.5" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function certBg(cert: string) {
  const map: Record<string, string> = {
    G: "bg-green-600",    PG: "bg-green-500",   "PG-13": "bg-yellow-600",
    R: "bg-red-600",      NC17: "bg-red-800",   "TV-MA": "bg-red-700",
    "TV-14": "bg-orange-600", "TV-PG": "bg-yellow-500", "TV-G": "bg-green-600",
  };
  return map[cert] ?? "bg-zinc-600";
}

function metaColor(score: number) {
  if (score >= 61) return "bg-green-600 text-white";
  if (score >= 40) return "bg-yellow-500 text-black";
  return "bg-red-600 text-white";
}

function formatVotes(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatMoney(n: number) {
  if (!n) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function RatingRing({ value, max = 10, color = "#e11d48" }: { value: number; max?: number; color?: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <svg className="absolute" width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#27272a" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <span className="relative text-sm font-black text-white z-10">{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DetailsModal() {
  const router = useRouter();
  const { isOpen, mediaId, mediaType, closeDetailModal } = useDetailModalStore();
  const { user, watchlist, favorites, addToWatchlist, removeFromWatchlist, addToFavorites, removeFromFavorites } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [loading, setLoading]         = useState(true);
  const [details, setDetails]         = useState<any | null>(null);
  const [imdbData, setImdbData]       = useState<ImdbData | null>(null);
  const [activeTab, setActiveTab]     = useState<TabId>("overview");
  const [playTrailer, setPlayTrailer] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const [copiedLink, setCopiedLink]   = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [loadingFavorite, setLoadingFavorite]   = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Seasons & Episodes states
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Ref to the scroll container to force scroll-to-top on actions
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const inWatchlist = mediaId ? watchlist.some((item) => String(item.mediaId) === String(mediaId)) : false;
  const isFavorite  = mediaId ? favorites.some((item) => String(item.mediaId) === String(mediaId)) : false;

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !mediaId || !mediaType) return;

    async function loadData() {
      setLoading(true);
      setActiveTab("overview");
      setPlayTrailer(false);
      setActiveTrailer(null);
      setImdbData(null);
      setDetails(null);
      setSelectedSeason(1);
      setSeasonEpisodes([]);

      try {
        const enhanced = await tmdbService.getDetailsEnhanced(mediaId!, mediaType!);
        setDetails(enhanced);

        // Background IMDb enrichment
        fetch(`/api/imdb/poster?id=${mediaId}&type=${mediaType}&mode=json`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data && !data.error) setImdbData(data); })
          .catch(() => {});
      } catch (err) {
        console.error("DetailsModal load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, mediaId, mediaType]);

  // Dynamically load episodes of selected TV season
  useEffect(() => {
    if (!isOpen || mediaType !== "tv" || !mediaId) return;

    async function loadEpisodes() {
      setLoadingEpisodes(true);
      try {
        const res = await fetch(`/api/tv/season?tvId=${mediaId}&seasonNumber=${selectedSeason}`);
        if (res.ok) {
          const data = await res.json();
          setSeasonEpisodes(data.episodes || []);
        }
      } catch (err) {
        console.error("Failed to load season episodes:", err);
      } finally {
        setLoadingEpisodes(false);
      }
    }
    loadEpisodes();
  }, [isOpen, mediaId, mediaType, selectedSeason]);

  // Scroll tab content panel to top when active tab changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Scroll tab content panel to top when a trailer starts playing
  useEffect(() => {
    if (playTrailer) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [playTrailer, activeTrailer]);

  // ── Auth-gated actions ──────────────────────────────────────────────────────
  const handleWatchlistToggle = async () => {
    if (!user) { openAuthModal("login"); return; }
    setLoadingWatchlist(true);
    const method = inWatchlist ? "DELETE" : "POST";
    const url    = inWatchlist ? `/api/watchlist?mediaId=${mediaId}&mediaType=${mediaType}` : "/api/watchlist";
    const body   = inWatchlist ? undefined : JSON.stringify({ mediaId, mediaType, title: details?.title || details?.name, posterPath: details?.poster_path });
    try { await fetch(url, { method, headers: { "Content-Type": "application/json" }, body }); }
    finally { setLoadingWatchlist(false); }
    if (inWatchlist) removeFromWatchlist(String(mediaId), mediaType!); else addToWatchlist({ mediaId: String(mediaId), mediaType: mediaType!, title: details?.title || details?.name || "", posterPath: details?.poster_path || "" });
  };

  const handleFavoriteToggle = async () => {
    if (!user) { openAuthModal("login"); return; }
    setLoadingFavorite(true);
    const method = isFavorite ? "DELETE" : "POST";
    const url    = isFavorite ? `/api/favorites?mediaId=${mediaId}&mediaType=${mediaType}` : "/api/favorites";
    const body   = isFavorite ? undefined : JSON.stringify({ mediaId, mediaType, title: details?.title || details?.name, posterPath: details?.poster_path });
    try { await fetch(url, { method, headers: { "Content-Type": "application/json" }, body }); }
    finally { setLoadingFavorite(false); }
    if (isFavorite) removeFromFavorites(String(mediaId), mediaType!); else addToFavorites({ mediaId: String(mediaId), mediaType: mediaType!, title: details?.title || details?.name || "", posterPath: details?.poster_path || "" });
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/watch/${mediaType}/${mediaId}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWatch = useCallback(() => {
    closeDetailModal();
    router.push(`/watch/${mediaType}/${mediaId}`);
  }, [closeDetailModal, router, mediaId, mediaType]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const title         = details?.title || details?.name || "";
  const tagline       = details?.tagline || "";
  const year          = (details?.release_date || details?.first_air_date || "").slice(0, 4);
  const posterUrl     = details?.poster_path ? getImagePath(details.poster_path, "w500") : "/placeholder-media.png";
  const backdropUrl   = details?.backdrop_path ? getImagePath(details.backdrop_path, "w1280") : "";
  const tmdbScore     = details?.vote_average ?? 0;
  const runtime       = details?.runtime || null;
  const seasons       = details?.number_of_seasons || null;
  const episodes      = details?.number_of_episodes || null;
  const genres        = (details?.genres || []).map((g: any) => g.name);
  const overview      = details?.overview || "";
  const cert          = details?.certification || "";
  const keywords      = details?.keywords || [];
  const cast          = details?.cast || [];
  const crew          = details?.crew || [];
  const trailers      = details?.trailers || [];
  const backdrops     = details?.backdrops || [];
  const similar       = details?.similarTitles || [];
  const recs          = details?.recommendations || [];
  const providers     = details?.streamingProviders || [];
  const companies     = details?.productionCompanies || [];
  const userReviews   = details?.userReviews || [];
  const spokenLangs   = (details?.spoken_languages || []).map((l: any) => l.english_name || l.name);
  const countries     = (details?.production_countries || []).map((c: any) => c.name);
  const budget        = details?.budget;
  const revenue       = details?.revenue;
  const status        = details?.status;
  const collection    = details?.belongs_to_collection;
  const imdbUrl       = imdbData?.imdbUrl || (details?.imdbId ? `https://www.imdb.com/title/${details.imdbId}/` : null);
  const mainTrailer   = trailers[0]?.key || null;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Image Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-zinc-800 rounded-full p-2"
            onClick={() => setLightboxImg(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={getImagePath(lightboxImg, "original")} alt="Backdrop" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      <Dialog isOpen={isOpen} onClose={closeDetailModal}>
        <DialogContent showCloseButton={false} className="max-w-5xl w-full max-h-[95vh] p-0 bg-[#0c0c10] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col">

          {/* Close button */}
          <button
            onClick={closeDetailModal}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shadow-lg cursor-pointer"
            aria-label="Close details modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ── Hero Banner ─────────────────────────────────────────────────── */}
          {loading ? (
            <Skeleton className="w-full h-64 rounded-none" />
          ) : (
            <div className="relative w-full h-52 md:h-72 flex-shrink-0 overflow-hidden">
              {/* Backdrop image */}
              {backdropUrl && (
                <img src={backdropUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-[#0c0c10]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c10]/90 via-transparent to-transparent" />

              {/* Trailer overlay */}
              {playTrailer && (mainTrailer || activeTrailer) && (
                <div className="absolute inset-0 z-10">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${activeTrailer || mainTrailer}?autoplay=1&mute=0`}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                  <button
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 rounded-full p-1.5 text-white z-20"
                    onClick={() => { setPlayTrailer(false); setActiveTrailer(null); }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Content positioned over hero */}
              <div className="absolute inset-0 flex items-end p-5 md:p-7 gap-5">
                {/* Poster */}
                <div className="hidden md:block flex-shrink-0 w-28 h-40 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50 relative">
                  <img src={posterUrl} alt={title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-media.png"; }} />
                </div>

                {/* Title block */}
                <div className="flex-1 min-w-0 space-y-1.5 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {cert && (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${certBg(cert)} text-white`}>
                        {cert}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 border border-rose-500/40 px-2 py-0.5 rounded">
                      {mediaType === "movie" ? "Movie" : "Series"}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight line-clamp-2">{title}</h1>
                  {tagline && <p className="text-sm text-zinc-400 italic">"{tagline}"</p>}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium pt-0.5">
                    {year && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{year}</span>}
                    {runtime && <><span className="text-zinc-600">•</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.floor(runtime / 60)}h {runtime % 60}m</span></>}
                    {seasons && <><span className="text-zinc-600">•</span><span className="flex items-center gap-1"><Tv className="w-3 h-3" />{seasons} Season{seasons > 1 ? "s" : ""}</span></>}
                    {episodes && <><span className="text-zinc-600">•</span><span>{episodes} Episodes</span></>}
                    {genres.slice(0, 3).map((g: string) => (
                      <><span className="text-zinc-600">•</span><span key={g}>{g}</span></>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Rating + Action Row ─────────────────────────────────────────── */}
          {!loading && details && (
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 md:px-7 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
              {/* Ratings */}
              <div className="flex items-center gap-4">
                {tmdbScore > 0 && (
                  <div className="flex items-center gap-2">
                    <RatingRing value={tmdbScore} color="#e11d48" />
                    <div className="text-xs text-zinc-500">
                      <div className="font-semibold text-zinc-300">TMDB</div>
                      <div>{formatVotes(details?.vote_count || 0)} votes</div>
                    </div>
                  </div>
                )}
                {imdbData?.rating && (
                  <a href={imdbData.imdbUrl || "#"} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 hover:border-amber-400/60 rounded-xl px-3 py-2 transition-all group">
                    <div className="text-center">
                      <div className="text-amber-400 font-black text-xs tracking-widest uppercase flex items-center gap-1">IMDb <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" /></div>
                      <div className="text-amber-300 font-black text-lg leading-none">{imdbData.rating.toFixed(1)}</div>
                      {imdbData.voteCount && <div className="text-zinc-500 text-[9px]">{formatVotes(imdbData.voteCount)}</div>}
                    </div>
                  </a>
                )}
                {imdbData?.metacriticScore != null && (
                  <div className="flex flex-col items-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Metacritic</div>
                    <span className={`font-black text-sm px-2.5 py-1.5 rounded-lg ${metaColor(imdbData.metacriticScore)}`}>
                      {imdbData.metacriticScore}
                    </span>
                    {imdbData.metacriticCount && <div className="text-[9px] text-zinc-600 mt-0.5">{imdbData.metacriticCount} reviews</div>}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {mainTrailer && (
                  <Button
                    onClick={() => { setPlayTrailer(true); setActiveTrailer(mainTrailer); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" /> Trailer
                  </Button>
                )}
                <Button
                  onClick={handleWatch}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-100 text-black text-sm font-bold rounded-xl transition-all"
                >
                  <Play className="w-4 h-4 fill-current" /> Watch
                </Button>
                <button
                  onClick={handleWatchlistToggle}
                  disabled={loadingWatchlist}
                  className={`p-2.5 rounded-xl border transition-all ${inWatchlist ? "bg-rose-600/20 border-rose-600/50 text-rose-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}
                  title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleFavoriteToggle}
                  disabled={loadingFavorite}
                  className={`p-2.5 rounded-xl border transition-all ${isFavorite ? "bg-rose-600/20 border-rose-600/50 text-rose-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-xl border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                  title="Share"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          {!loading && details && (
            <div className="flex-shrink-0 flex items-center gap-1 px-5 md:px-7 pt-3 pb-0 border-b border-zinc-800/60 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
              {TABS.filter(tab => tab.id !== "episodes" || mediaType === "tv").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-b-2 -mb-px flex-shrink-0 ${
                    activeTab === tab.id
                      ? "text-white border-rose-600 bg-zinc-800/50"
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Tab Content ─────────────────────────────────────────────────── */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-7 space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)}
              </div>
            ) : !details ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                <Film className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Failed to load details. Please try again.</p>
              </div>
            ) : (
              <div className="p-5 md:p-7">

                {/* ═══ OVERVIEW TAB ══════════════════════════════════════════ */}
                {activeTab === "overview" && (
                  <div className="space-y-6">

                    {/* Plot */}
                    <div>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Synopsis</h3>
                      <p className="text-zinc-300 leading-relaxed text-sm md:text-base">{overview || "No synopsis available."}</p>
                    </div>

                    {/* Streaming Providers */}
                    {providers.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Stream On</h3>
                        <div className="flex flex-wrap gap-2">
                          {providers.map((p: any) => (
                            <div key={p.provider_id} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-1.5">
                              {p.logo_path && (
                                <img src={getImagePath(p.logo_path, "w500")} alt={p.provider_name} className="w-5 h-5 rounded-md object-cover" />
                              )}
                              <span className="text-xs font-semibold text-zinc-300">{p.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keywords */}
                    {(keywords.length > 0 || (imdbData?.interests && imdbData.interests.length > 0)) && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Tags & Keywords</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {imdbData?.interests?.map((tag: string) => (
                            <span key={`imdb-${tag}`} className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1">
                              {tag}
                            </span>
                          ))}
                          {keywords.map((kw: string) => (
                            <span key={kw} className="text-[11px] font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 rounded-full px-2.5 py-1 hover:text-white hover:border-zinc-500 transition-colors cursor-default">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Cast */}
                    {cast.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">Top Cast</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {cast.slice(0, 8).map((member: any) => (
                            <div key={member.id} className="flex items-center gap-2.5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-2 hover:border-zinc-600 transition-colors">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                {member.profile_path ? (
                                  <img src={getImagePath(member.profile_path, "w500")} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-500"><Users className="w-4 h-4" /></div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{member.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">{member.character}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {cast.length > 8 && (
                          <button onClick={() => setActiveTab("details")} className="mt-2 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                            View all {cast.length} cast members <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Crew */}
                    {crew.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Key Crew</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {crew.map((c: any) => (
                            <div key={`${c.id}-${c.job}`} className="bg-zinc-800/40 rounded-xl p-2.5 border border-zinc-700/40">
                              <div className="text-xs font-bold text-white">{c.name}</div>
                              <div className="text-[10px] text-rose-400 font-semibold">{c.job}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collection */}
                    {collection && (
                      <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50">
                        {collection.backdrop_path && (
                          <img src={getImagePath(collection.backdrop_path, "w780")} alt={collection.name} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        )}
                        <div className="relative flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-zinc-900/80 to-transparent">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-1">Part of a Collection</div>
                            <div className="text-sm font-bold text-white">{collection.name}</div>
                          </div>
                          <Film className="w-8 h-8 text-zinc-600 flex-shrink-0" />
                        </div>
                      </div>
                    )}

                    {/* User Reviews */}
                    {userReviews.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">User Reviews</h3>
                        <div className="space-y-3">
                          {userReviews.slice(0, 2).map((rev: any) => (
                            <div key={rev.id} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-rose-600/20 border border-rose-600/30 flex items-center justify-center text-rose-400 text-xs font-black">
                                  {rev.author?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white">{rev.author}</div>
                                  {rev.author_details?.rating && (
                                    <div className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      {rev.author_details.rating}/10
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-zinc-400 text-xs leading-relaxed line-clamp-4">
                                {rev.content?.replace(/\r?\n/g, " ") || ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ EPISODES TAB ══════════════════════════════════════════ */}
                {activeTab === "episodes" && mediaType === "tv" && (
                  <div className="space-y-6">
                    {/* Season Selector */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Season:</span>
                      <div className="flex gap-2">
                        {details.seasons && details.seasons.length > 0 ? (
                          details.seasons
                            .filter((s: any) => s.season_number > 0)
                            .map((s: any) => (
                              <button
                                key={s.id}
                                onClick={() => setSelectedSeason(s.season_number)}
                                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                  selectedSeason === s.season_number
                                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/15"
                                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                {s.name || `Season ${s.season_number}`}
                              </button>
                            ))
                        ) : (
                          Array.from({ length: details.number_of_seasons || 1 }).map((_, i) => {
                            const sNum = i + 1;
                            return (
                              <button
                                key={sNum}
                                onClick={() => setSelectedSeason(sNum)}
                                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                  selectedSeason === sNum
                                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/15"
                                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                Season {sNum}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Episodes List */}
                    {loadingEpisodes ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Loader className="h-7 w-7 animate-spin text-rose-600" />
                        <span className="text-xs text-zinc-500 font-bold">Loading season episodes...</span>
                      </div>
                    ) : seasonEpisodes.length > 0 ? (
                      <div className="space-y-3">
                        {seasonEpisodes.map((ep: any) => {
                          const epNum = ep.episode_number;
                          const epTitle = ep.name || `Episode ${epNum}`;
                          const epPlot = ep.overview || "No overview available for this episode.";
                          const epThumb = ep.still_path ? getImagePath(ep.still_path, "w500") : null;
                          const epRuntime = ep.runtime ? `${ep.runtime}m` : null;
                          const epAirDate = ep.air_date ? new Date(ep.air_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

                          return (
                            <div
                              key={ep.id}
                              onClick={() => {
                                closeDetailModal();
                                router.push(`/watch/tv/${mediaId}?s=${selectedSeason}&e=${epNum}`);
                              }}
                              className="group flex flex-col sm:flex-row gap-4 p-3 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800/80 rounded-2xl cursor-pointer transition-all duration-200"
                            >
                              {/* Episode Thumbnail */}
                              <div className="w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-white/5 relative flex-shrink-0">
                                {epThumb ? (
                                  <img src={epThumb} alt={epTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-655 bg-zinc-900">
                                    <Film className="w-8 h-8 opacity-30" />
                                  </div>
                                )}
                                {/* Play Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center shadow-lg text-white">
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </div>
                                </div>
                              </div>

                              {/* Episode details */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center text-left space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] font-black text-rose-500 tracking-wider uppercase">Episode {epNum}</span>
                                  {(epRuntime || epAirDate) && <span className="text-zinc-700 text-xs">•</span>}
                                  {epRuntime && <span className="text-[10px] text-zinc-400 font-semibold">{epRuntime}</span>}
                                  {epAirDate && <span className="text-[10px] text-zinc-500 font-medium">{epAirDate}</span>}
                                </div>
                                <h4 className="text-sm font-extrabold text-white group-hover:text-rose-400 transition-colors line-clamp-1">{epTitle}</h4>
                                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 pt-0.5 font-medium">{epPlot}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                        <Tv className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">No episodes found for this season.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ DETAILS TAB ═══════════════════════════════════════════ */}
                {activeTab === "details" && (
                  <div className="space-y-6">

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Status", value: status, icon: <Info className="w-3.5 h-3.5" /> },
                        { label: "Release Year", value: year, icon: <Calendar className="w-3.5 h-3.5" /> },
                        { label: "Runtime", value: runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : null, icon: <Clock className="w-3.5 h-3.5" /> },
                        { label: "Seasons", value: seasons ? `${seasons} Season${seasons > 1 ? "s" : ""}` : null, icon: <Tv className="w-3.5 h-3.5" /> },
                        { label: "Episodes", value: episodes ? `${episodes} Episodes` : null, icon: <Clapperboard className="w-3.5 h-3.5" /> },
                        { label: "Rating", value: cert || null, icon: <Award className="w-3.5 h-3.5" /> },
                        { label: "Budget", value: budget ? formatMoney(budget) : null, icon: <Globe className="w-3.5 h-3.5" /> },
                        { label: "Revenue", value: revenue ? formatMoney(revenue) : null, icon: <Globe className="w-3.5 h-3.5" /> },
                        { label: "TMDB Score", value: tmdbScore > 0 ? `${tmdbScore.toFixed(1)} / 10` : null, icon: <Star className="w-3.5 h-3.5" /> },
                        { label: "IMDb Score", value: imdbData?.rating ? `${imdbData.rating.toFixed(1)} / 10` : null, icon: <Star className="w-3.5 h-3.5" /> },
                        { label: "Metacritic", value: imdbData?.metacriticScore != null ? `${imdbData.metacriticScore} / 100` : null, icon: <ThumbsUp className="w-3.5 h-3.5" /> },
                      ].filter(i => i.value).map(({ label, value, icon }) => (
                        <div key={label} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider mb-1">{icon}{label}</div>
                          <div className="text-white text-sm font-bold">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Genres */}
                    {genres.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {genres.map((g: string) => (
                            <span key={g} className="text-xs font-semibold text-rose-400 bg-rose-600/10 border border-rose-600/20 rounded-full px-3 py-1">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {spokenLangs.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Spoken Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {spokenLangs.map((l: string) => (
                            <span key={l} className="text-xs font-medium text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-3 py-1">{l}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Countries */}
                    {countries.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">Production Countries</h3>
                        <div className="flex flex-wrap gap-2">
                          {countries.map((c: string) => (
                            <span key={c} className="text-xs font-medium text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-3 py-1 flex items-center gap-1"><Globe className="w-3 h-3" />{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Production Companies */}
                    {companies.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">Production Companies</h3>
                        <div className="flex flex-wrap gap-3">
                          {companies.map((co: any) => (
                            <div key={co.id} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2">
                              {co.logo_path ? (
                                <img src={getImagePath(co.logo_path, "w500")} alt={co.name} className="h-5 w-auto object-contain filter invert opacity-70" />
                              ) : (
                                <Clapperboard className="w-4 h-4 text-zinc-500" />
                              )}
                              <span className="text-xs font-semibold text-zinc-300">{co.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Cast */}
                    {cast.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">Full Cast ({cast.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {cast.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-2.5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-2 hover:border-zinc-600 transition-colors">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                                {member.profile_path ? (
                                  <img src={getImagePath(member.profile_path, "w500")} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-500"><Users className="w-4 h-4" /></div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{member.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">{member.character}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* IMDb & TMDB external links */}
                    <div>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-2">External Links</h3>
                      <div className="flex flex-wrap gap-2">
                        {imdbUrl && (
                          <a href={imdbUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold px-3 py-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 rounded-xl transition-all">
                            <ExternalLink className="w-3.5 h-3.5" /> View on IMDb
                          </a>
                        )}
                        <a
                          href={`https://www.themoviedb.org/${mediaType}/${mediaId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-bold px-3 py-2 bg-teal-400/10 hover:bg-teal-400/20 border border-teal-400/30 text-teal-400 rounded-xl transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View on TMDB
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ MEDIA TAB ═════════════════════════════════════════════ */}
                {activeTab === "media" && (
                  <div className="space-y-6">

                    {/* Trailers */}
                    {trailers.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">Trailers & Teasers</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {trailers.map((video: any) => (
                            <div key={video.key} className="relative group rounded-xl overflow-hidden cursor-pointer bg-zinc-800 border border-zinc-700/50 hover:border-rose-600/50 transition-all"
                              onClick={() => { setActiveTrailer(video.key); setPlayTrailer(true); window.scrollTo({ top: 0 }); }}>
                              <img
                                src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                                alt={video.name}
                                className="w-full h-36 object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-rose-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-2">
                                <div className="text-white text-xs font-bold truncate">{video.name}</div>
                                <div className="text-zinc-400 text-[10px] font-semibold uppercase">{video.type}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Backdrop Gallery */}
                    {backdrops.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">
                          Backdrop Gallery ({backdrops.length} images)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {backdrops.map((path: string, idx: number) => (
                            <div
                              key={idx}
                              className="relative rounded-xl overflow-hidden cursor-pointer group border border-zinc-700/40 hover:border-rose-600/40 transition-all"
                              style={{ aspectRatio: "16/9" }}
                              onClick={() => setLightboxImg(path)}
                            >
                              <img
                                src={getImagePath(path, "w780")}
                                alt={`Backdrop ${idx + 1}`}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trailers.length === 0 && backdrops.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">No media available for this title.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ MORE LIKE THIS TAB ════════════════════════════════════ */}
                {activeTab === "more" && (
                  <div className="space-y-6">
                    {[
                      { label: "Recommended For You", items: recs },
                      { label: "Similar Titles", items: similar },
                    ].map(({ label, items }) =>
                      items.length > 0 ? (
                        <div key={label}>
                          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-3">{label}</h3>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {items.map((item: any) => {
                              const itemTitle = item.title || item.name;
                              const itemPoster = item.poster_path ? getImagePath(item.poster_path, "w500") : "/placeholder-media.png";
                              const itemScore = item.vote_average?.toFixed(1);
                              return (
                                <div
                                  key={item.id}
                                  className="group cursor-pointer"
                                  onClick={() => { closeDetailModal(); setTimeout(() => { useDetailModalStore.getState().openDetailModal(String(item.id), item.media_type || mediaType!); }, 200); }}
                                >
                                  <div className="relative rounded-xl overflow-hidden border border-zinc-700/40 group-hover:border-rose-600/50 transition-all">
                                    <img
                                      src={itemPoster}
                                      alt={itemTitle}
                                      className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      style={{ aspectRatio: "2/3" }}
                                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-media.png"; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                      <div>
                                        {itemScore && (
                                          <div className="flex items-center gap-0.5 text-amber-400 text-[10px] font-bold">
                                            <Star className="w-2.5 h-2.5 fill-current" />{itemScore}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="w-6 h-6 rounded-full bg-rose-600/90 flex items-center justify-center">
                                        <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-1.5 px-0.5">
                                    <div className="text-[11px] font-bold text-white truncate">{itemTitle}</div>
                                    {itemScore && (
                                      <div className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                                        <Star className="w-2.5 h-2.5 fill-current" />{itemScore}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null
                    )}
                    {recs.length === 0 && similar.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
                        <Film className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">No recommendations available.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
