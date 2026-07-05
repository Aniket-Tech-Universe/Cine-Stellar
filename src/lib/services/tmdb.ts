// Service layer for querying TMDB API with server-side caching and automated mock data fallbacks.
import {
  MOCK_MOVIES,
  MOCK_SHOWS,
  MOCK_CAST,
  MOCK_REVIEWS,
  MOCK_VIDEOS,
  MediaItem,
  CastMember,
  Review,
  Video,
  GENRE_MAP,
} from "./mockData";

const API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY =
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  process.env.TMDB_API_KEY ||
  "";
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

// Helpers to format image paths
export const getImagePath = (path: string | null, size: "original" | "w500" | "w780" | "w1280" = "w500") => {
  if (!path) return "/placeholder-media.png"; // We will make a fallback image or handle it gracefully
  if (path.startsWith("http")) return path;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// Generic fetch wrapper with retries and Next.js ISR cache configs
async function fetchFromTMDB<T>(endpoint: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T> {
  if (!TMDB_API_KEY || TMDB_API_KEY.includes("your_")) {
    throw new Error("TMDB API key is not configured.");
  }

  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...params,
  });

  const url = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        next: { revalidate },
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`TMDB request failed with status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }

  throw new Error("Failed to load data from TMDB after retries.");
}

export const tmdbService = {
  // Get trending items
  getTrending: async (
    mediaType: "movie" | "tv" | "all" = "all",
    timeWindow: "day" | "week" = "week"
  ): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/trending/${mediaType}/${timeWindow}`);
      return data.results.map((item) => ({
        ...item,
        media_type: item.media_type || (mediaType === "all" ? "movie" : mediaType),
      }));
    } catch (error) {
      console.warn("TMDB getTrending failed, falling back to mock data:", error);
      return mediaType === "tv" ? MOCK_SHOWS : MOCK_MOVIES;
    }
  },


  // Get popular items
  getPopular: async (mediaType: "movie" | "tv" = "movie", page = 1): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/${mediaType}/popular`, { page: String(page) });
      return data.results.map((item) => ({ ...item, media_type: mediaType }));
    } catch (error) {
      console.warn("TMDB getPopular failed, falling back to mock data:", error);
      return mediaType === "tv" ? MOCK_SHOWS : MOCK_MOVIES;
    }
  },

  // Get top rated items
  getTopRated: async (mediaType: "movie" | "tv" = "movie", page = 1): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/${mediaType}/top_rated`, { page: String(page) });
      return data.results.map((item) => ({ ...item, media_type: mediaType }));
    } catch (error) {
      console.warn("TMDB getTopRated failed, falling back to mock data:", error);
      return mediaType === "tv" ? MOCK_SHOWS.filter((s) => s.vote_average > 8) : MOCK_MOVIES.filter((m) => m.vote_average > 8);
    }
  },

  // Get upcoming movies
  getUpcoming: async (page = 1): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>("/movie/upcoming", { page: String(page) });
      return data.results.map((item) => ({ ...item, media_type: "movie" }));
    } catch (error) {
      console.warn("TMDB getUpcoming failed, falling back to mock data:", error);
      return MOCK_MOVIES;
    }
  },

  // Get show airing today
  getAiringToday: async (page = 1): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>("/tv/airing_today", { page: String(page) });
      return data.results.map((item) => ({ ...item, media_type: "tv" }));
    } catch (error) {
      console.warn("TMDB getAiringToday failed, falling back to mock data:", error);
      return MOCK_SHOWS;
    }
  },

  // Get item details
  getDetails: async (id: string, mediaType: "movie" | "tv"): Promise<MediaItem> => {
    try {
      const data = await fetchFromTMDB<any>(`/${mediaType}/${id}`);
      return { ...data, media_type: mediaType };
    } catch (error) {
      console.warn(`TMDB getDetails for ${mediaType} ${id} failed, falling back:`, error);
      const mock = (mediaType === "movie" ? MOCK_MOVIES : MOCK_SHOWS).find((m) => m.id === id);
      if (mock) return mock;
      throw new Error(`Content not found with ID ${id} in mock or TMDB dataset.`);
    }
  },

  // Get credits/cast
  getCredits: async (id: string, mediaType: "movie" | "tv"): Promise<CastMember[]> => {
    try {
      const data = await fetchFromTMDB<{ cast: any[] }>(`/${mediaType}/${id}/credits`);
      return data.cast.slice(0, 15).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path,
      }));
    } catch (error) {
      console.warn(`TMDB getCredits for ${mediaType} ${id} failed, falling back:`, error);
      return MOCK_CAST[id] || [
        { id: 991, name: "Famous Actor", character: "Lead Role", profile_path: null },
        { id: 992, name: "Co-Star", character: "Supporting Role", profile_path: null },
      ];
    }
  },

  // Get video trailers
  getVideos: async (id: string, mediaType: "movie" | "tv"): Promise<Video[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/${mediaType}/${id}/videos`);
      return data.results.filter(
        (v) => (v.site === "YouTube" || v.site === "Vimeo") && (v.type === "Trailer" || v.type === "Teaser")
      );
    } catch (error) {
      console.warn(`TMDB getVideos for ${mediaType} ${id} failed, falling back:`, error);
      return MOCK_VIDEOS[id] || [{ id: "mock-v", key: "YoHD9XEInc0", name: "Default Preview", site: "YouTube", type: "Trailer" }];
    }
  },

  // Get reviews
  getReviews: async (id: string, mediaType: "movie" | "tv"): Promise<Review[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/${mediaType}/${id}/reviews`);
      return data.results.slice(0, 5).map((r) => ({
        id: r.id,
        author: r.author,
        content: r.content,
        created_at: r.created_at,
        rating: r.author_details?.rating,
      }));
    } catch (error) {
      console.warn(`TMDB getReviews for ${mediaType} ${id} failed, falling back:`, error);
      return MOCK_REVIEWS[id] || [];
    }
  },

  // Get recommendations
  getRecommendations: async (id: string, mediaType: "movie" | "tv"): Promise<MediaItem[]> => {
    try {
      const data = await fetchFromTMDB<{ results: any[] }>(`/${mediaType}/${id}/recommendations`);
      return data.results.slice(0, 10).map((item) => ({ ...item, media_type: mediaType }));
    } catch (error) {
      console.warn(`TMDB getRecommendations for ${mediaType} ${id} failed, falling back:`, error);
      const pool = mediaType === "movie" ? MOCK_MOVIES : MOCK_SHOWS;
      return pool.filter((item) => item.id !== id).slice(0, 5);
    }
  },

  // Search movies, shows, and actors
  search: async (query: string, page = 1): Promise<{ results: MediaItem[]; total_pages: number }> => {
    if (!query.trim()) return { results: [], total_pages: 0 };
    try {
      const data = await fetchFromTMDB<{ results: any[]; total_pages: number }>("/search/multi", {
        query,
        page: String(page),
      });
      // Filter out results that don't have backdrops or posters, and map them
      const results = data.results
        .filter((item) => item.media_type === "movie" || item.media_type === "tv")
        .map((item) => ({ ...item, title: item.title || item.name })) as MediaItem[];
      return { results, total_pages: data.total_pages };
    } catch (error) {
      console.warn(`TMDB search for "${query}" failed, falling back:`, error);
      const q = query.toLowerCase();
      const results = [...MOCK_MOVIES, ...MOCK_SHOWS].filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.overview?.toLowerCase().includes(q)
      );
      return { results, total_pages: 1 };
    }
  },

  // Filter and discover
  discover: async (
    mediaType: "movie" | "tv" = "movie",
    filters: {
      with_genres?: string;
      primary_release_year?: string;
      first_air_date_year?: string;
      with_original_language?: string;
      sort_by?: string;
      page?: number;
    } = {}
  ): Promise<{ results: MediaItem[]; total_pages: number }> => {
    try {
      const params: Record<string, string> = {
        page: String(filters.page || 1),
      };

      if (filters.with_genres) params.with_genres = filters.with_genres;
      if (filters.with_original_language) params.with_original_language = filters.with_original_language;
      if (filters.sort_by) params.sort_by = filters.sort_by;

      if (mediaType === "movie") {
        if (filters.primary_release_year) params.primary_release_year = filters.primary_release_year;
      } else {
        if (filters.first_air_date_year) params.first_air_date_year = filters.first_air_date_year;
      }

      const data = await fetchFromTMDB<{ results: any[]; total_pages: number }>(`/discover/${mediaType}`, params);
      return {
        results: data.results.map((item) => ({ ...item, media_type: mediaType })),
        total_pages: data.total_pages,
      };
    } catch (error) {
      console.warn("TMDB discover failed, filtering local mock data:", error);
      let results = mediaType === "movie" ? [...MOCK_MOVIES] : [...MOCK_SHOWS];

      if (filters.with_genres) {
        const genreId = parseInt(filters.with_genres);
        results = results.filter((item) => item.genre_ids.includes(genreId));
      }

      return { results, total_pages: 1 };
    }
  },

  // Get genres list
  getGenres: async (mediaType: "movie" | "tv" = "movie"): Promise<{ id: number; name: string }[]> => {
    try {
      const data = await fetchFromTMDB<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list`);
      return data.genres;
    } catch (error) {
      // Fallback local genres list
      const defaultGenres = Object.entries(GENRE_MAP).map(([id, name]) => ({
        id: parseInt(id),
        name: name as string,
      }));
      return mediaType === "movie" 
        ? defaultGenres.slice(0, 10) 
        : defaultGenres.slice(5, 15);
    }
  },

  // Get watch providers streaming list
  getWatchProviders: async (
    mediaId: string,
    mediaType: "movie" | "tv"
  ): Promise<any[]> => {
    try {
      const data = await fetchFromTMDB<{ results: Record<string, any> }>(
        `/${mediaType}/${mediaId}/watch/providers`
      );
      // Grab US watch providers list or fallback to the first available country code
      const usProviders = data.results?.["US"] || Object.values(data.results || {})[0];
      return usProviders?.flatrate || usProviders?.rent || usProviders?.buy || [];
    } catch (error) {
      console.warn("Failed to fetch watch providers:", error);
      return [];
    }
  },

  // Get details for a specific season of a TV show
  getSeasonDetails: async (
    tvId: string,
    seasonNumber: number
  ): Promise<{ episodes: any[] }> => {
    try {
      return await fetchFromTMDB<{ episodes: any[] }>(
        `/tv/${tvId}/season/${seasonNumber}`
      );
    } catch (error) {
      console.warn("Failed to fetch season details:", error);
      return { episodes: [] };
    }
  },

  // Enhanced details fetch with everything in one call using append_to_response
  getDetailsEnhanced: async (id: string, mediaType: "movie" | "tv"): Promise<any> => {
    try {
      const appendFields = [
        "keywords",
        "release_dates",
        "content_ratings",
        "images",
        "similar",
        "external_ids",
        "credits",
        "videos",
        "reviews",
        "recommendations",
        "watch/providers",
      ].join(",");

      const data = await fetchFromTMDB<any>(
        `/${mediaType}/${id}`,
        { append_to_response: appendFields, "images.include_image_language": "en,null" },
        1800
      );

      // Extract US certification
      let certification = "";
      if (mediaType === "movie") {
        const us = data.release_dates?.results?.find((r: any) => r.iso_3166_1 === "US");
        certification = us?.release_dates?.[0]?.certification || "";
      } else {
        const us = data.content_ratings?.results?.find((r: any) => r.iso_3166_1 === "US");
        certification = us?.rating || "";
      }

      // Extract keywords
      const keywords: string[] = (
        data.keywords?.keywords ||
        data.keywords?.results ||
        []
      ).slice(0, 20).map((k: any) => k.name);

      // Extract backdrops (max 12, English/null language)
      const backdrops: string[] = (
        data.images?.backdrops || []
      ).slice(0, 12).map((img: any) => img.file_path);

      // Extract posters (max 6)
      const posters: string[] = (
        data.images?.posters || []
      ).slice(0, 6).map((img: any) => img.file_path);

      // Extract US watch providers
      const usProviders = data["watch/providers"]?.results?.["US"] || {};
      const streamingProviders = [
        ...(usProviders.flatrate || []),
        ...(usProviders.free || []),
      ];

      return {
        ...data,
        certification,
        keywords,
        backdrops,
        posters,
        streamingProviders,
        cast: data.credits?.cast?.slice(0, 20) || [],
        crew: data.credits?.crew?.filter((c: any) =>
          ["Director", "Executive Producer", "Producer", "Screenplay", "Story"].includes(c.job)
        ).slice(0, 8) || [],
        trailers: (
          data.videos?.results || []
        ).filter((v: any) =>
          (v.site === "YouTube" || v.site === "Vimeo") &&
          (v.type === "Trailer" || v.type === "Teaser")
        ).slice(0, 6),
        imdbId: data.external_ids?.imdb_id || "",
        similarTitles: (
          data.similar?.results || []
        ).slice(0, 12).map((item: any) => ({ ...item, media_type: mediaType })),
        recommendations: (
          data.recommendations?.results || []
        ).slice(0, 12).map((item: any) => ({ ...item, media_type: mediaType })),
        userReviews: (data.reviews?.results || []).slice(0, 5),
        productionCompanies: (data.production_companies || []).slice(0, 5),
      };
    } catch (error) {
      console.warn(`TMDB getDetailsEnhanced for ${mediaType} ${id} failed:`, error);
      return null;
    }
  },
};
