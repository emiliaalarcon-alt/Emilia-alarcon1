const RAILWAY_URL = "https://workspaceapi-server-production-5bd0.up.railway.app";

function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname === "emiliaalarcon-alt.github.io") {
    return RAILWAY_URL;
  }
  return "";
}

const API_BASE = getApiBase();

export const apiUrl = (path: string) => `${API_BASE}${path}`;
