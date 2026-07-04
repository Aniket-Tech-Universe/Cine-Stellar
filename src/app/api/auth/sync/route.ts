import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { setSessionCookie } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { uid, email, displayName } = await request.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user exists in database by email
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user in DB linked with Firebase UID
      user = await prisma.user.create({
        data: {
          id: uid,
          email,
          name: displayName || email.split("@")[0],
          password: null, // Password is managed securely by Firebase Auth Spark plan
        },
      });
    }

    // Sign local secure JWT session cookie using existing utils
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Firebase auth sync database mapping error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
