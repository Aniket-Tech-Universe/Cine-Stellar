import { NextRequest, NextResponse } from "next/server";
import { tmdbService } from "@/lib/services/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tvId = searchParams.get("tvId");
  const seasonNumber = searchParams.get("seasonNumber");

  if (!tvId || !seasonNumber) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const data = await tmdbService.getSeasonDetails(tvId, Number(seasonNumber));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch season details on API handler:", error);
    return NextResponse.json({ error: "Failed to fetch season details" }, { status: 500 });
  }
}
