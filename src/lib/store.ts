// Zustand global state management for the active detail modal, search overlay, auth modal, and user session context.
import { create } from "zustand";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  preferredLanguage: string;
  theme: string;
}

interface DetailModalState {
  isOpen: boolean;
  mediaId: string | null;
  mediaType: "movie" | "tv" | null;
  openDetailModal: (id: string, type: "movie" | "tv") => void;
  closeDetailModal: () => void;
}

interface AuthModalState {
  isOpen: boolean;
  view: "login" | "signup";
  openAuthModal: (view?: "login" | "signup") => void;
  closeAuthModal: () => void;
  setAuthView: (view: "login" | "signup") => void;
}

interface StoreMediaItem {
  mediaId: string;
  mediaType: string;
  title?: string;
  posterPath?: string;
  backdropPath?: string;
}

interface AuthState {
  user: UserProfile | null;
  watchlist: StoreMediaItem[];
  favorites: StoreMediaItem[];
  setUser: (user: UserProfile | null) => void;
  setWatchlist: (list: StoreMediaItem[]) => void;
  setFavorites: (list: StoreMediaItem[]) => void;
  addToWatchlist: (item: StoreMediaItem) => void;
  removeFromWatchlist: (mediaId: string, mediaType: string) => void;
  addToFavorites: (item: StoreMediaItem) => void;
  removeFromFavorites: (mediaId: string, mediaType: string) => void;
  logout: () => void;
}

export const useDetailModalStore = create<DetailModalState>((set) => ({
  isOpen: false,
  mediaId: null,
  mediaType: null,
  openDetailModal: (id, type) => set({ isOpen: true, mediaId: id, mediaType: type }),
  closeDetailModal: () => set({ isOpen: false, mediaId: null, mediaType: null }),
}));

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  view: "login",
  openAuthModal: (view = "login") => set({ isOpen: true, view }),
  closeAuthModal: () => set({ isOpen: false }),
  setAuthView: (view) => set({ view }),
}));

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  watchlist: [],
  favorites: [],
  setUser: (user) => set({ user }),
  setWatchlist: (watchlist) => set({ watchlist }),
  setFavorites: (favorites) => set({ favorites }),
  addToWatchlist: (item) =>
    set((state) => ({
      watchlist: [
        ...state.watchlist.filter(
          (w) => !(w.mediaId === item.mediaId && w.mediaType === item.mediaType)
        ),
        item,
      ],
    })),
  removeFromWatchlist: (mediaId, mediaType) =>
    set((state) => ({
      watchlist: state.watchlist.filter(
        (w) => !(w.mediaId === mediaId && w.mediaType === mediaType)
      ),
    })),
  addToFavorites: (item) =>
    set((state) => ({
      favorites: [
        ...state.favorites.filter(
          (f) => !(f.mediaId === item.mediaId && f.mediaType === item.mediaType)
        ),
        item,
      ],
    })),
  removeFromFavorites: (mediaId, mediaType) =>
    set((state) => ({
      favorites: state.favorites.filter(
        (f) => !(f.mediaId === mediaId && f.mediaType === mediaType)
      ),
    })),
  logout: async () => {
    try {
      // Dynamic import to avoid loading Firebase on non-auth static pages
      const { auth } = await import("./firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST" });
      set({ user: null, watchlist: [], favorites: [] });
      window.location.reload();
    } catch (e) {
      console.error("Logout failed", e);
    }
  },
}));
