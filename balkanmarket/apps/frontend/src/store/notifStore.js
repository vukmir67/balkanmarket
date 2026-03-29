// src/store/notifStore.js
import { create } from "zustand";

export const useNotifStore = create((set, get) => ({
  notifs: [],

  add: (message, type = "success") => {
    const id = Date.now();
    set((s) => ({ notifs: [...s.notifs, { id, message, type }] }));
    setTimeout(() => get().remove(id), 4000);
  },

  remove: (id) => set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),

  success: (msg) => get().add(msg, "success"),
  error:   (msg) => get().add(msg, "error"),
  info:    (msg) => get().add(msg, "info"),
}));
