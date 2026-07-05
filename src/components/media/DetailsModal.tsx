// High-end cinematic details overlay modal displaying posters, taglines, ratings, trailers, cast lists, and user review comments.
"use client";

import React, { useEffect, useState } from "react";
import { Play, Plus, Check, Star, Heart, Share2, Film } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import Button from "../ui/button";
import { useDetailModalStore, useAuthModalStore, useAuthStore } from "@/lib/store";
import { tmdbService, getImagePath } from "@/lib/services/tmdb";
import { MediaItem, CastMember, Review, Video } from "@/lib/services/mockData";
import { useRouter } from "next/navigation";
import { Skeleton } from "../ui/skeleton";

export default function DetailsModal() {
  const router = useRouter();
  const { isOpen, mediaId, mediaType, closeDetailModal } = useDetailModalStore();
  const { 
    user, 
    watchlist, 
    favorites, 
    addToWatchlist, 
    removeFromWatchlist, 
    addToFavorites, 
    removeFromFavorites 
  } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<MediaItem | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [playTrailer, setPlayTrailer] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inWatchlist = mediaId ? watchlist.some((item) => String(item.mediaId) === String(mediaId)) : false;
  const isFavorite = mediaId ? favorites.some((item) => String(item.mediaId) === String(mediaId)) : false;

  // Fetch all required data once modal opens
  useEffect(() => {
    if (!isOpen || !mediaId || !mediaType) return;

    async function loadData() {
      setLoading(true);
      setPlayTrailer(false);
      try {
        const [detRes, castRes, vidRes, revRes, recRes, provRes] = await Promise.all([
          tmdbService.getDetails(mediaId!, mediaType!),
          tmdbService.getCredits(mediaId!, mediaType!),
          tmdbService.getVideos(mediaId!, mediaType!),
          tmdbService.getReviews(mediaId!, mediaType!),
          tmdbService.getRecommendations(mediaId!, mediaType!),
          tmdbService.getWatchProviders(mediaId!, mediaType!),
        ]);

        setDetails(detRes);
        setCast(castRes);
        setVideos(vidRes);
        setReviews(revRes);
        setRecommendations(recRes);
        setProviders(provRes);
      } catch (err) {
        console.error("Failed to load details modal data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, mediaId, mediaType]);



  const handleWatchlistToggle = async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    setLoadingWatchlist(true);
    const method = inWatchlist ? "DELETE" : "POST";
    const url = inWatchlist 
      ? `/api/watchlist?mediaId=${mediaId}&mediaType=${mediaType}`
      : "/api/watchlist";
    const body = inWatchlist
      ? null
      : JSON.stringify({
          mediaId: details?.id,
          mediaType,
          title: details?.title || details?.name,
          posterPath: details?.poster_path,
          backdropPath: details?.backdrop_path,
        });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        if (inWatchlist) {
          removeFromWatchlist(String(mediaId), mediaType || "movie");
        } else {
          addToWatchlist({ 
            mediaId: String(mediaId), 
            mediaType: mediaType || "movie",
            title: details?.title || details?.name,
            posterPath: details?.poster_path,
            backdropPath: details?.backdrop_path,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    setLoadingFavorite(true);
    const method = isFavorite ? "DELETE" : "POST";
    const url = isFavorite 
      ? `/api/favorites?mediaId=${mediaId}&mediaType=${mediaType}`
      : "/api/favorites";
    const body = isFavorite
      ? null
      : JSON.stringify({
          mediaId: details?.id,
          mediaType,
          title: details?.title || details?.name,
          posterPath: details?.poster_path,
          backdropPath: details?.backdrop_path,
        });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        if (isFavorite) {
          removeFromFavorites(String(mediaId), mediaType || "movie");
        } else {
          addToFavorites({ mediaId: String(mediaId), mediaType: mediaType || "movie" });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/watch/${mediaType}/${mediaId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePlayClick = () => {
    closeDetailModal();
    router.push(`/watch/${mediaType}/${mediaId}`);
  };

  const trailer = videos.find((v) => v.type === "Trailer" || v.type === "Teaser") || videos[0];

  return (
    <Dialog isOpen={isOpen} onClose={closeDetailModal}>
      <DialogContent className="max-w-5xl bg-zinc-950 border border-zinc-900 rounded-3xl p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col space-y-4 p-8">
            <Skeleton className="w-full h-64 md:h-[450px] rounded-2xl" />
            <Skeleton className="w-1/3 h-8 rounded" />
            <Skeleton className="w-1/2 h-6 rounded" />
            <Skeleton className="w-full h-24 rounded" />
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          details && (
            <div className="flex flex-col">
              {/* Top Banner (Trailer or Backdrop Image Overlay) */}
              <div className="relative w-full h-[40vh] md:h-[550px] bg-zinc-950">
                {playTrailer && trailer ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                    title="Trailer Player"
                    className="w-full h-full border-none"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      src={getImagePath(details.backdrop_path, "original")}
                      alt="backdrop"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  </>
                )}

                {/* Info Text Overlay */}
                {!playTrailer && (
                  <div className="absolute bottom-6 left-6 md:left-12 max-w-2xl text-left">
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      {details.title || details.name}
                    </h2>
                    {details.tagline && (
                      <p className="text-zinc-300 italic text-sm md:text-base mt-1.5 md:mt-2">
                        "{details.tagline}"
                      </p>
                    )}

                    {/* Interaction CTAs */}
                    <div className="flex items-center space-x-3.5 mt-5">
                      <Button variant="primary" onClick={handlePlayClick} className="px-7 py-3">
                        <Play className="h-5 w-5 fill-current mr-2" />
                        Play Now
                      </Button>

                      {trailer && (
                        <Button variant="glass" onClick={() => setPlayTrailer(true)} className="px-6 py-3">
                          <Film className="h-5 w-5 mr-2" />
                          Trailer
                        </Button>
                      )}

                      <button
                        onClick={handleWatchlistToggle}
                        disabled={loadingWatchlist}
                        className="flex items-center justify-center p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white transition-all cursor-pointer"
                        title="Add to Watchlist"
                      >
                        {inWatchlist ? (
                          <Check className="h-5 w-5 text-rose-500" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={handleFavoriteToggle}
                        disabled={loadingFavorite}
                        className="flex items-center justify-center p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white transition-all cursor-pointer"
                        title="Favorite Item"
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>

                      <button
                        onClick={handleShare}
                        className="flex items-center justify-center p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white transition-all relative cursor-pointer"
                        title="Copy Link to Clipboard"
                      >
                        <Share2 className="h-5 w-5" />
                        {copiedLink && (
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-white text-[10px] px-2 py-1 rounded font-bold">
                            Copied!
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Details Layout */}
              <div className="p-6 md:p-12 space-y-10 text-left">
                {/* Meta details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold text-zinc-400">
                      <span className="text-rose-500 font-bold capitalize">{mediaType}</span>
                      <span>•</span>
                      <span>
                        {details.release_date
                          ? new Date(details.release_date).getFullYear()
                          : details.first_air_date
                          ? new Date(details.first_air_date).getFullYear()
                          : "Unknown"}
                      </span>
                      <span>•</span>
                      {details.runtime && (
                        <span>
                          {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                        </span>
                      )}
                      {details.number_of_seasons && (
                        <span>
                          {details.number_of_seasons} Season{details.number_of_seasons > 1 ? "s" : ""}
                        </span>
                      )}
                      <span>•</span>
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star className="h-4.5 w-4.5 fill-current mr-0.5" />
                        {details.vote_average?.toFixed(1) || "NR"}
                      </div>
                    </div>

                    <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                      {details.overview}
                    </p>

                    {/* Watch Providers badge line */}
                    {providers && providers.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-zinc-900">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                          Where to Stream
                        </span>
                        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                          {providers.slice(0, 6).map((provider) => (
                            <div
                              key={provider.provider_id}
                              className="relative flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl shadow"
                              title={provider.provider_name}
                            >
                              <img
                                src={getImagePath(provider.logo_path, "w500")}
                                alt={provider.provider_name}
                                className="h-5 w-5 rounded-md object-cover"
                              />
                              <span className="text-xs text-zinc-300 font-bold">
                                {provider.provider_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar stats details */}
                  <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3.5 text-xs text-zinc-400">
                    {details.budget ? (
                      <div>
                        <span className="font-bold text-white block">Budget</span>
                        <span>${details.budget.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {details.revenue ? (
                      <div>
                        <span className="font-bold text-white block">Revenue</span>
                        <span>${details.revenue.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {details.status && (
                      <div>
                        <span className="font-bold text-white block">Status</span>
                        <span>{details.status}</span>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-white block">Genres</span>
                      <span>
                        {details.genre_ids
                          ? details.genre_ids
                              .map((id) => {
                                const names: { [key: number]: string } = {
                                  28: "Action",
                                  12: "Adventure",
                                  16: "Animation",
                                  35: "Comedy",
                                  80: "Crime",
                                  99: "Documentary",
                                  18: "Drama",
                                  10751: "Family",
                                  14: "Fantasy",
                                  27: "Horror",
                                  9648: "Mystery",
                                  10749: "Romance",
                                  878: "Sci-Fi",
                                };
                                return names[id] || "Genre";
                              })
                              .join(", ")
                          : "Cinematic"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cast Carousel Section */}
                {cast && cast.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Cast</h3>
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar py-2">
                      {cast.map((actor) => (
                        <div key={actor.id} className="flex-shrink-0 w-24 md:w-28 text-center space-y-2">
                          <img
                            src={
                              actor.profile_path
                                ? getImagePath(actor.profile_path)
                                : "https://api.dicebear.com/7.x/initials/svg?seed=" + actor.name
                            }
                            alt={actor.name}
                            className="h-28 w-24 md:h-32 md:w-28 rounded-2xl object-cover bg-zinc-900 border border-zinc-800"
                          />
                          <p className="text-[10px] md:text-xs font-bold text-white truncate px-1">
                            {actor.name}
                          </p>
                          <p className="text-[9px] md:text-[10px] text-zinc-400 truncate px-1">
                            {actor.character}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {recommendations && recommendations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                      More Like This
                    </h3>
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar py-2">
                      {recommendations.slice(0, 12).map((rec) => (
                        <div
                          key={rec.id}
                          onClick={() => {
                            useDetailModalStore.getState().openDetailModal(String(rec.id), rec.media_type || mediaType);
                          }}
                          className="flex-shrink-0 w-28 sm:w-36 rounded-xl overflow-hidden cursor-pointer border border-zinc-900 aspect-[2/3] bg-zinc-900/50 group relative shadow-md"
                        >
                          <img
                            src={
                              rec.poster_path && rec.poster_path.startsWith("http")
                                ? rec.poster_path
                                : `/api/imdb/poster?id=${rec.id}&type=${rec.media_type || mediaType}&title=${encodeURIComponent(rec.title || rec.name || "")}&fallback=${rec.poster_path ? encodeURIComponent(rec.poster_path) : ""}`
                            }
                            alt={rec.title || rec.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-103"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all p-2 text-center">
                            <p className="text-[10px] sm:text-xs font-bold text-white leading-tight line-clamp-2">
                              {rec.title || rec.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div className="space-y-4">
                  <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Reviews</h3>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-850 space-y-2.5 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-white">{rev.author}</p>
                            <p className="text-xs text-zinc-500">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-zinc-400 line-clamp-3 leading-relaxed">{rev.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">No reviews yet for this title.</p>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
