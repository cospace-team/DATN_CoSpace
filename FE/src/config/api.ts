// `||` so a blank VITE_API_BASE_URL falls back too, and no trailing slash so "${API_BASE_URL}/api/..."
// never becomes "//api/...".
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
