import { NextRequest, NextResponse } from "next/server";

// In-memory LRU-style cache to store TMDB ID → IMDb enrichment data
const enrichmentCache = new Map<string, {
  url: string;
  imdbId: string;
  rating?: number;
  voteCount?: number;
  imdbUrl?: string;
  metacriticScore?: number;
  metacriticCount?: number;
  interests?: string[];
}>();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "movie";
  const title = searchParams.get("title") || "";
  const fallback = searchParams.get("fallback") || "";
  const mode = searchParams.get("mode") || "redirect"; // "redirect" for img src, "json" for enrichment data

  if (!id) {
    if (mode === "json") return NextResponse.json({ error: "no id" }, { status: 400 });
    return handleFallback(fallback);
  }

  const cacheKey = `${type}_${id}`;
  const cached = enrichmentCache.get(cacheKey);
  
  if (cached) {
    if (mode === "json") {
      return NextResponse.json({
        imdbId: cached.imdbId, imdbUrl: cached.imdbUrl,
        rating: cached.rating, voteCount: cached.voteCount,
        metacriticScore: cached.metacriticScore, metacriticCount: cached.metacriticCount,
        interests: cached.interests,
        posterUrl: cached.url,
      });
    }
    return NextResponse.redirect(cached.url, { status: 307 });
  }

  try {
    let imdbId = "";

    // 1. Resolve IMDb ID from TMDB
    const tmdbEndpoint = type === "movie"
      ? `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/tv/${id}/external_ids?api_key=${TMDB_API_KEY}`;

    const tmdbRes = await fetch(tmdbEndpoint);
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      imdbId = tmdbData.imdb_id || "";
    }

    let resolvedPoster = "";
    let rating: number | undefined;
    let voteCount: number | undefined;
    let imdbUrl: string | undefined;
    let metacriticScore: number | undefined;
    let metacriticCount: number | undefined;
    let interests: string[] | undefined;

    // 2. Fetch from imdbapi.dev using IMDb ID
    if (imdbId) {
      const imdbRes = await fetch(`https://api.imdbapi.dev/titles/${imdbId}`);
      if (imdbRes.ok) {
        const imdbData = await imdbRes.json();
        resolvedPoster = imdbData.primaryImage?.url || "";
        rating = imdbData.rating?.aggregateRating;
        voteCount = imdbData.rating?.voteCount;
        imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
        metacriticScore = imdbData.metacritic?.score;
        metacriticCount = imdbData.metacritic?.reviewCount;
        interests = (imdbData.interests || []).slice(0, 6).map((i: any) => i.name || i);
      }
    }

    // 3. Store in cache regardless
    const entry = {
      url: resolvedPoster || buildTmdbFallback(fallback),
      imdbId,
      rating,
      voteCount,
      imdbUrl,
      metacriticScore,
      metacriticCount,
      interests,
    };
    
    // Limit cache to 500 entries
    if (enrichmentCache.size >= 500) {
      const firstKey = enrichmentCache.keys().next().value;
      if (firstKey) enrichmentCache.delete(firstKey);
    }
    enrichmentCache.set(cacheKey, entry);

    if (mode === "json") {
      return NextResponse.json({
        imdbId, imdbUrl, rating, voteCount,
        metacriticScore, metacriticCount, interests,
        posterUrl: entry.url,
      });
    }

    if (resolvedPoster) {
      return NextResponse.redirect(resolvedPoster, { status: 307 });
    }
  } catch (error) {
    console.error(`IMDb enrichment failed for ${type} ${id}:`, error);
  }

  if (mode === "json") return NextResponse.json({ error: "enrichment failed" }, { status: 500 });
  return handleFallback(fallback);
}

function buildTmdbFallback(fallback: string) {
  if (!fallback) return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/placeholder-media.png`;
  if (fallback.startsWith("http")) return fallback;
  return `https://image.tmdb.org/t/p/w500${fallback.startsWith("/") ? "" : "/"}${fallback}`;
}

function handleFallback(fallback: string) {
  return NextResponse.redirect(buildTmdbFallback(fallback), { status: 307 });
}
