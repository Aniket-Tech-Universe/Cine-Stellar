import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setSessionCookie } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { uid, email, displayName } = await request.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user document exists in Firestore
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    let userData: any;

    if (!userSnap.exists()) {
      userData = {
        id: uid,
        email,
        name: displayName || email.split("@")[0],
        role: "USER",
        avatar: "avatar_1",
        preferredLanguage: "en",
        theme: "dark",
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, userData);
    } else {
      userData = userSnap.data();
    }

    // Sign local secure JWT session cookie
    await setSessionCookie({
      userId: userData.id,
      email: userData.email,
      role: userData.role,
    });

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Firestore user sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
