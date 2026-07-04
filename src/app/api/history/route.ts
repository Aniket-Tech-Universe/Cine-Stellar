import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy } from "firebase/firestore";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const q = query(
      collection(db, "users", user.id, "history"),
      orderBy("lastWatched", "desc")
    );
    const querySnapshot = await getDocs(q);
    const watchHistory = querySnapshot.docs.map((docSnap) => docSnap.data());

    return NextResponse.json({ watchHistory });
  } catch (error) {
    console.error("Watch history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch watch history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      mediaId,
      mediaType,
      title,
      backdropPath,
      progress,
      duration,
      season,
      episode,
    } = await request.json();

    if (!mediaId || !mediaType || !title || progress === undefined || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docId = `${mediaType}_${mediaId}`;
    const docRef = doc(db, "users", user.id, "history", docId);

    const historyItem = {
      userId: user.id,
      mediaId: String(mediaId),
      mediaType,
      title,
      backdropPath: backdropPath || "",
      progress: Number(progress),
      duration: Number(duration),
      season: season ? Number(season) : null,
      episode: episode ? Number(episode) : null,
      lastWatched: new Date().toISOString(),
    };

    await setDoc(docRef, historyItem);

    return NextResponse.json({ message: "Playback progress saved", item: historyItem });
  } catch (error) {
    console.error("Watch history post error:", error);
    return NextResponse.json({ error: "Failed to save playback progress" }, { status: 500 });
  }
}
