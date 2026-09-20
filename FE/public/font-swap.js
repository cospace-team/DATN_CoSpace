// Switches the print-media font <link> tags in index.html to media="all"
// once each has loaded, so Google Fonts CSS doesn't block first render but
// still applies as soon as it's ready. Kept as an external file (rather
// than an inline onload="" attribute) so the site's CSP script-src can stay
// 'self' only, with no 'unsafe-inline'.
["font-link-inter", "font-link-symbols"].forEach(function (id) {
  var link = document.getElementById(id);
  if (!link) return;
  if (link.sheet) {
    link.media = "all";
    return;
  }
  link.addEventListener("load", function () {
    link.media = "all";
  });
});
