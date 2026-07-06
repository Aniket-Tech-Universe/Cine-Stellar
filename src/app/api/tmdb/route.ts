import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Build the target TMDB query params
  const targetParams = new URLSearchParams();
  targetParams.append("api_key", TMDB_API_KEY);

  // Forward all other search params except "path"
  searchParams.forEach((value, key) => {
    if (key !== "path") {
      targetParams.append(key, value);
    }
  });

  const url = `${API_BASE_URL}${path}?${targetParams.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB request failed with status: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB Proxy request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
