import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const q = query(
      collection(db, "users", user.id, "watchlist"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const watchlist = querySnapshot.docs.map((docSnap) => docSnap.data());

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mediaId, mediaType, title, posterPath, backdropPath } = await request.json();

    if (!mediaId || !mediaType || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docId = `${mediaType}_${mediaId}`;
    const docRef = doc(db, "users", user.id, "watchlist", docId);

    const watchlistItem = {
      userId: user.id,
      mediaId: String(mediaId),
      mediaType,
      title,
      posterPath: posterPath || "",
      backdropPath: backdropPath || "",
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, watchlistItem);

    return NextResponse.json({ message: "Added to watchlist", item: watchlistItem });
  } catch (error) {
    console.error("Watchlist post error:", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");
    const mediaType = searchParams.get("mediaType");

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: "Missing mediaId or mediaType" }, { status: 400 });
    }

    const docId = `${mediaType}_${mediaId}`;
    const docRef = doc(db, "users", user.id, "watchlist", docId);
    await deleteDoc(docRef);

    return NextResponse.json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error("Watchlist delete error:", error);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
