// src/store/authStore.js
import { create } from "zustand";
import api from "../lib/api";

export const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem("user") || "null"),
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("accessToken",  data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user",         JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || "Greška pri prijavi";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/auth/register", { email, password, displayName });
      localStorage.setItem("accessToken",  data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user",         JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || "Greška pri registraciji";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(data));
      set({ user: data });
    } catch (_) {}
  },

  setError: (error) => set({ error }),
}));
