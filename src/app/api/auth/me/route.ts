// API Route handler for retrieving/updating current user context.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getCurrentUser, hashPassword } from "@/lib/auth-utils";

// Get current user details
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

// Update user details
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, avatar, preferredLanguage, theme, newPassword } = await request.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
    if (theme !== undefined) updateData.theme = theme;
    
    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
    }

    const userRef = doc(db, "users", user.id);
    await setDoc(userRef, updateData, { merge: true });

    // Fetch the updated user profile from Firestore to return
    const userSnap = await getDoc(userRef);
    const updatedUser = userSnap.data();

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile settings" },
      { status: 500 }
    );
  }
}
