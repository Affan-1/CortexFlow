// Thin wrapper around the auth API endpoints.
// Keeps components from having to know API paths or axios details directly.

import api from "./api";

export const registerUser = async ({ name, email, password }) => {
  const response = await api.post("/auth/register", { name, email, password });
  return response.data; // { token, user }
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data; // { token, user }
};


export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const updateProfile = async ({ name, email, avatar }) => {
  const response = await api.put("/auth/profile", { name, email, avatar });
  return response.data;
};

export const updateWorkspace = async ({ workspaceName, workspaceUrl, timezone }) => {
  const response = await api.put("/auth/workspace", {
    workspaceName,
    workspaceUrl,
    timezone,
  });
  return response.data;
};

export const regenerateApiKey = async () => {
  const response = await api.post("/auth/api-key/regenerate");
  return response.data;
};

export const deleteWorkspace = async () => {
  const response = await api.delete("/auth/workspace");
  return response.data;
};
