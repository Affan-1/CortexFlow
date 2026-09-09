// Global auth state, shared across the whole app.
// Uses Zustand's "persist" middleware so the user stays logged in
// even after refreshing the page (it saves to localStorage automatically).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerUser, loginUser } from "../services/authService";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Note: registering does NOT log the user in automatically.
      // They're sent to the login page afterward to sign in themselves.
      register: async ({ name, email, password }) => {
        set({ isLoading: true, error: null });

        try {
          await registerUser({ name, email, password });

          set({ isLoading: false });

          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Registration failed. Please try again.";

          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });

        try {
          const data = await loginUser({ email, password });

          localStorage.setItem("cortexflow_token", data.token);

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Invalid email or password.";

          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      updateUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("cortexflow_token");
        set({ user: null, token: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "cortexflow-auth", // localStorage key
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
