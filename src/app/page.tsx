// Main Cine-Stellar Home Page rendering the cinematic Hero Banner and multiple categories of media cards.
import React from "react";
import HeroBanner from "@/components/media/HeroBanner";
import MovieRow from "@/components/media/MovieRow";
import { tmdbService } from "@/lib/services/tmdb";
import ClientRows from "@/components/media/ClientRows";

export const revalidate = 3600; // Revalidate page cache every hour (ISR)

export default async function HomePage() {
  // SSR fetch queries
  let trending: any[] = [];
  let popularMovies: any[] = [];
  let popularShows: any[] = [];
  let topRated: any[] = [];
  let upcoming: any[] = [];
  
  // Genres list
  let actionMovies: any[] = [];
  let comedyMovies: any[] = [];
  let sciFiMovies: any[] = [];
  let horrorMovies: any[] = [];

  try {
    const [trendRes, popMovRes, popTvRes, topRes, upRes, actRes, comRes, sciRes, horRes] = await Promise.all([
      tmdbService.getTrending("all", "week"),
      tmdbService.getPopular("movie"),
      tmdbService.getPopular("tv"),
      tmdbService.getTopRated("movie"),
      tmdbService.getUpcoming(),
      tmdbService.discover("movie", { with_genres: "28" }), // Action
      tmdbService.discover("movie", { with_genres: "35" }), // Comedy
      tmdbService.discover("movie", { with_genres: "878" }), // Sci-Fi
      tmdbService.discover("movie", { with_genres: "27" }), // Horror
    ]);

    trending = trendRes;
    popularMovies = popMovRes;
    popularShows = popTvRes;
    topRated = topRes;
    upcoming = upRes;
    actionMovies = actRes.results;
    comedyMovies = comRes.results;
    sciFiMovies = sciRes.results;
    horrorMovies = horRes.results;
  } catch (err) {
    console.error("Home page SSR fetch failed", err);
  }

  // Pick the first popular movie or trending item as featured hero content
  const featured = popularMovies[0] || trending[0] || {
    id: "27205",
    title: "Inception",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    backdrop_path: "/8ZgRnsn52C6z4amC59TTzsCj5u.jpg",
    poster_path: "/o0solCr486IHI7Rg2u4hQ1yYrDO.jpg",
    media_type: "movie",
    genre_ids: [28, 878, 12],
    vote_average: 8.4,
    tagline: "Your mind is the scene of the crime.",
  };

  return (
    <div className="relative pb-24 w-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Aurora glow ambient background shapes */}
      <div className="aurora-bg">
        <div className="aurora-glow-1" />
        <div className="aurora-glow-2" />
      </div>

      {/* Cinematic Header Video / Image Banner */}
      <HeroBanner featured={featured} />

      {/* Media Slider lanes */}
      <div className="relative z-20 space-y-2.5 -mt-10 sm:-mt-16 md:-mt-20">
        {/* Dynamic client-specific personalized rows: Watchlist, History */}
        <ClientRows />

        {/* Live TMDB media categories */}
        <MovieRow title="Trending Now" items={trending} />
        <MovieRow title="Popular Movies" items={popularMovies} />
        <MovieRow title="Popular TV Shows" items={popularShows} />
        <MovieRow title="Upcoming Releases" items={upcoming} />
        <MovieRow title="Critically Acclaimed" items={topRated} />
        
        {/* Genre specific slider lanes */}
        <MovieRow title="Adrenaline Fuelled Action" items={actionMovies} />
        <MovieRow title="Laugh Out Loud Comedies" items={comedyMovies} />
        <MovieRow title="Mind Bending Sci-Fi" items={sciFiMovies} />
        <MovieRow title="Bone Chilling Horror" items={horrorMovies} />
      </div>
    </div>
  );
}
