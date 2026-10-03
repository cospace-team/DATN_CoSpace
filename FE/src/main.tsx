import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/trustedTypesPolicy";

// After a redeploy, a tab opened on the previous build asks for page chunks that no longer exist.
// Reload once to pick up the new build instead of showing an error page; the timestamp guard stops
// a reload loop if a chunk is genuinely missing.
window.addEventListener("vite:preloadError", (event) => {
  const key = "cospace:chunk-reload-at";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(key)) || 0;
  } catch {
    // Storage blocked: still reload once below.
  }
  if (Date.now() - last < 10_000) return;
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
