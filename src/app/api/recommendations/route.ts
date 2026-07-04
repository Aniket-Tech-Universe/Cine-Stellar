import { NextRequest, NextResponse } from "next/server";
import { tmdbService } from "@/lib/services/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  const mediaType = searchParams.get("mediaType") as "movie" | "tv";

  if (!mediaId || !mediaType) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const data = await tmdbService.getRecommendations(mediaId, mediaType);
    return NextResponse.json({ recommendations: data });
  } catch (error) {
    console.error("Failed to fetch recommendations on API handler:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
