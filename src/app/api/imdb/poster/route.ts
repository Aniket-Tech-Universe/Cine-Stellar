import { NextRequest, NextResponse } from "next/server";

// In-memory cache to store TMDB ID to IMDb Amazon CDN URL mappings
const posterCache = new Map<string, string>();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "8088221e5df33c3fa7b69dc0c2219d36";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "movie";
  const title = searchParams.get("title") || "";
  const fallback = searchParams.get("fallback") || "";

  if (!id) {
    return handleFallback(fallback);
  }

  const cacheKey = `${type}_${id}`;
  if (posterCache.has(cacheKey)) {
    return NextResponse.redirect(posterCache.get(cacheKey)!, { status: 307 });
  }

  try {
    let imdbId = "";

    // 1. Get IMDb ID from TMDB
    if (type === "movie") {
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`;
      const res = await fetch(tmdbUrl);
      if (res.ok) {
        const data = await res.json();
        imdbId = data.imdb_id || "";
      }
    } else {
      const tmdbUrl = `https://api.themoviedb.org/3/tv/${id}/external_ids?api_key=${TMDB_API_KEY}`;
      const res = await fetch(tmdbUrl);
      if (res.ok) {
        const data = await res.json();
        imdbId = data.imdb_id || "";
      }
    }

    let resolvedPoster = "";

    // 2. Fetch from imdbapi.dev if IMDb ID exists
    if (imdbId) {
      const imdbUrl = `https://api.imdbapi.dev/titles/${imdbId}`;
      const res = await fetch(imdbUrl);
      if (res.ok) {
        const data = await res.json();
        resolvedPoster = data.primaryImage?.url || "";
      }
    }

    // 3. Fallback: Search imdbapi.dev by title if details failed
    if (!resolvedPoster && title) {
      const searchUrl = `https://api.imdbapi.dev/search/titles?query=${encodeURIComponent(title)}&limit=3`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const match = results.find(
          (r: any) => r.type === (type === "movie" ? "movie" : "tvSeries")
        ) || results[0];
        
        resolvedPoster = match?.primaryImage?.url || "";
      }
    }

    // 4. Return resolved poster or fall back to TMDB
    if (resolvedPoster) {
      posterCache.set(cacheKey, resolvedPoster);
      return NextResponse.redirect(resolvedPoster, { status: 307 });
    }
  } catch (error) {
    console.error(`IMDb poster enrichment failed for ${type} ${id}:`, error);
  }

  return handleFallback(fallback);
}

function handleFallback(fallback: string) {
  if (fallback) {
    // If it's a full URL already
    if (fallback.startsWith("http")) {
      return NextResponse.redirect(fallback, { status: 307 });
    }
    // TMDB base image URL fallback
    return NextResponse.redirect(`https://image.tmdb.org/t/p/w500${fallback.startsWith("/") ? "" : "/"}${fallback}`, { status: 307 });
  }
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/placeholder-media.png`, { status: 307 });
}
