// A single, shared axios instance for every API call in the app.
//
// - baseURL comes from .env (VITE_API_URL), so it's easy to point at
//   localhost during development and a real backend URL after deploying.
// - The request interceptor automatically attaches the saved JWT token
//   (if there is one) to every outgoing request, so individual API calls
//   never need to worry about auth headers themselves.
// - The response interceptor catches 401 errors (expired/invalid token)
//   and logs the user out automatically.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cortexflow_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cortexflow_token");
      localStorage.removeItem("cortexflow_user");

      // Avoid an infinite loop if we're already on the login page.
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
