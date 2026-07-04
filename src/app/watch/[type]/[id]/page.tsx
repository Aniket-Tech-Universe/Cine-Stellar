// Watch page resolving parameters and rendering the fullscreen video player.
import React from "react";
import VideoPlayer from "@/components/player/VideoPlayer";
import { tmdbService } from "@/lib/services/tmdb";
import { notFound } from "next/navigation";

interface WatchPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  // Load basic details for title metadata
  let title = "Streaming Media";
  let backdropPath = null;

  try {
    const details = await tmdbService.getDetails(id, type);
    title = details.title || details.name || "Streaming Media";
    backdropPath = details.backdrop_path;
  } catch (err) {
    console.error("Failed to load watch page details:", err);
  }

  return (
    <div className="w-screen h-screen bg-black">
      <VideoPlayer
        mediaId={id}
        mediaType={type}
        title={title}
        backdropPath={backdropPath}
        season={type === "tv" ? 1 : undefined}
        episode={type === "tv" ? 1 : undefined}
        episodesCount={type === "tv" ? 10 : undefined}
      />
    </div>
  );
}
