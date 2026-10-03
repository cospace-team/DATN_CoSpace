// Applies the saved theme class to <html> before the first paint, so dark-mode users don't see the
// light theme flash while the app bundle loads (ThemeProvider takes over from here). External
// file rather than an inline script so the CSP script-src can stay 'self' only.
// Keep the storage key in sync with ThemeProvider's default ("workhub-theme").
(function () {
  var theme = "system";
  try {
    theme = localStorage.getItem("workhub-theme") || "system";
  } catch (e) {
    // Storage blocked: fall back to the system preference.
  }
  var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.add(dark ? "dark" : "light");
})();
