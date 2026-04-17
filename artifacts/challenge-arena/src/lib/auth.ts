import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

export function getAuthToken() {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

// Setup the auth token getter for the API client
setBaseUrl(import.meta.env.VITE_API_BASE_URL ?? null);
setAuthTokenGetter(() => getAuthToken());
