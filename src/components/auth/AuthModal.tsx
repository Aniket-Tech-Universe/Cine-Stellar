// Premium Glassmorphic Credentials Login & Signup Dialog overlay.
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import Button from "../ui/button";
import { useAuthModalStore, useAuthStore } from "@/lib/store";
import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

export default function AuthModal() {
  const { isOpen, view, closeAuthModal, setAuthView } = useAuthModalStore();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let userCredential;
      if (view === "login") {
        // Firebase Login Email/Password
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Firebase Signup Email/Password
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name && userCredential.user) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }

      const firebaseUser = userCredential.user;

      // Sync user data to local database to get user session cookie
      const syncRes = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || name || firebaseUser.email?.split("@")[0],
        }),
      });

      if (!syncRes.ok) {
        const syncData = await syncRes.json();
        throw new Error(syncData.error || "Session synchronization failed.");
      }

      const syncData = await syncRes.json();

      // Successful Auth
      setUser(syncData.user);
      closeAuthModal();
      
      // Clear inputs
      setEmail("");
      setPassword("");
      setName("");
      
      // Reload page to reflect user details
      window.location.reload();
    } catch (err: any) {
      console.error("Credentials Auth failed:", err);
      // Clean up user-friendly Firebase error messages
      let msg = err.message || "Failed to submit request.";
      if (msg.includes("auth/invalid-credential")) {
        msg = "Invalid email or password.";
      } else if (msg.includes("auth/email-already-in-use")) {
        msg = "This email is already registered.";
      } else if (msg.includes("auth/weak-password")) {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Firebase Google Popup Auth
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;

      // Sync Google User with relational Database
      const syncRes = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        }),
      });

      if (!syncRes.ok) {
        const syncData = await syncRes.json();
        throw new Error(syncData.error || "Session synchronization failed.");
      }

      const syncData = await syncRes.json();

      setUser(syncData.user);
      closeAuthModal();
      window.location.reload();
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      let msg = "Google Sign-In failed.";
      if (err.code === "auth/popup-closed-by-user") {
        msg = "Sign-in popup closed before completion.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={closeAuthModal}>
      <DialogContent className="max-w-md bg-zinc-950/95 border border-zinc-800">
        <div className="flex flex-col space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              CINE<span className="text-rose-600">STELLAR</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              {view === "login"
                ? "Sign in to resume your cinematic journeys"
                : "Create an account to start streaming"}
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            {view === "signup" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
            </div>

            <Button variant="primary" type="submit" isLoading={isLoading} className="w-full py-3 mt-2">
              {view === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-850" />
            </div>
            <span className="relative px-3 bg-zinc-950 text-xs text-zinc-500 uppercase font-semibold">
              Or continue with
            </span>
          </div>

          <Button
            variant="glass"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 border border-zinc-800 bg-zinc-900/40"
          >
            <svg className="h-5 w-5 text-rose-500 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign In with Google</span>
          </Button>

          <div className="text-center text-sm">
            {view === "login" ? (
              <p className="text-zinc-400">
                New to Cine-Stellar?{" "}
                <button
                  onClick={() => setAuthView("signup")}
                  className="text-rose-500 hover:underline font-semibold focus:outline-none"
                >
                  Sign up now.
                </button>
              </p>
            ) : (
              <p className="text-zinc-400">
                Already have an account?{" "}
                <button
                  onClick={() => setAuthView("login")}
                  className="text-rose-500 hover:underline font-semibold focus:outline-none"
                >
                  Sign in here.
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
