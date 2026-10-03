// `||` so a blank VITE_API_BASE_URL falls back too, and no trailing slash so "${API_BASE_URL}/api/..."
// never becomes "//api/...".
// A production build without VITE_API_BASE_URL used to fall back to localhost, which the CSP blocks
// anyway: every request failed and the site looked empty. It now falls back to the deployed API
// (keep in sync with connect-src in vercel.json).
const DEFAULT_API_BASE_URL = import.meta.env.PROD ? "https://datn-cospace.onrender.com" : "http://localhost:8080";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
