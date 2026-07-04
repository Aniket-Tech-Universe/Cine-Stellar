import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  const mediaType = searchParams.get("mediaType");

  if (!mediaId || !mediaType) {
    return NextResponse.json({ error: "Missing mediaId or mediaType" }, { status: 400 });
  }

  try {
    const docId = `${mediaType}_${mediaId}`;
    const docRef = doc(db, "users", user.id, "ratings", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return NextResponse.json({ rating: docSnap.data().rating });
    }

    return NextResponse.json({ rating: null });
  } catch (error) {
    console.error("Fetch rating error:", error);
    return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mediaId, mediaType, rating } = await request.json();

    if (!mediaId || !mediaType || rating === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docId = `${mediaType}_${mediaId}`;
    const docRef = doc(db, "users", user.id, "ratings", docId);

    const ratingItem = {
      userId: user.id,
      mediaId: String(mediaId),
      mediaType,
      rating: Number(rating),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, ratingItem);

    return NextResponse.json({ message: "Rating submitted successfully", rating: ratingItem });
  } catch (error) {
    console.error("Post rating error:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
