// Authentication utilities for password hashing, JWT creation/verification, and session retrieval.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET || "dev_only_jwt_secret_do_not_use_in_production_12345";
const COOKIE_NAME = "cinestellar_session";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// Sign JWT Token
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT Token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(payload: JWTPayload) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from request cookies loading from Firestore
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    // Fetch user document from Firestore using Admin SDK
    const userRef = db.collection("users").doc(decoded.userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return null;
    }

    return userSnap.data();
  } catch (error) {
    console.error("Error fetching current user from Firestore:", error);
    return null;
  }
}
