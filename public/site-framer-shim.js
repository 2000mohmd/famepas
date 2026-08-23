(function () {
  // Hide the placeholder brand-logo strip ("Trusted by 1,000+ brands" /
  // "Brand Section" / "Brand Logos") wherever it appears across pages.
  try {
    var style = document.createElement("style");
    style.setAttribute("id", "famepass-hide-brand-strip");
    style.textContent =
      '[data-framer-name="Brand Section"],' +
      '[data-framer-name="Brand Content"],' +
      '[data-framer-name="Brand Logos"],' +
      '[data-framer-name="Trusted by 1,000+ brands"]' +
      '{ display: none !important; }';
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}
})();

(function () {
  // Force-close the mobile hamburger overlay on the first click of its
  // close ("X") button, in case Framer's own toggle misfires.
  function findOverlay(start) {
    var el = start;
    for (var i = 0; i < 8 && el; i++) {
      var cs = window.getComputedStyle ? getComputedStyle(el) : null;
      if (
        cs &&
        (cs.position === "fixed" || cs.position === "absolute") &&
        el.offsetHeight > window.innerHeight * 0.4
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function forceClose(overlay) {
    if (overlay) {
      overlay.style.setProperty("display", "none", "important");
      overlay.style.setProperty("opacity", "0", "important");
      overlay.style.setProperty("pointer-events", "none", "important");
      overlay.setAttribute("aria-hidden", "true");
    }
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  document.addEventListener(
    "click",
    function (e) {
      var target =
        (e.target.closest &&
          e.target.closest(
            '[aria-label*="close" i], [data-framer-name*="close" i], [data-testid*="close" i]'
          )) ||
        null;

      if (!target && e.target.closest) {
        var svg = e.target.closest("svg, button");
        if (svg) {
          var overlayCandidate = findOverlay(svg);
          if (overlayCandidate) target = svg;
        }
      }

      if (!target) return;

      var overlay = findOverlay(target);
      // Give Framer's own handler a chance to run first; if the overlay is
      // still visible shortly after, force it closed.
      setTimeout(function () {
        if (!overlay) return;
        var cs = getComputedStyle(overlay);
        if (cs.display !== "none" && parseFloat(cs.opacity || "1") > 0) {
          forceClose(overlay);
        }
      }, 80);
    },
    true
  );
})();

(function () {
  if (window.__framerRangeFetchPatched) return;
  window.__framerRangeFetchPatched = true;

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var requestUrl = typeof input === "string" ? input : input && (input.href || input.url);

    try {
      var url = new URL(requestUrl, document.baseURI || window.location.href);
      var ranges = url.searchParams.get("range");

      if (url.pathname.endsWith(".framercms") && ranges) {
        var fileUrl = new URL(url.href);
        fileUrl.searchParams.delete("range");

        return nativeFetch(fileUrl.href, init).then(function (response) {
          if (!response.ok) return response;

          return response.arrayBuffer().then(function (buffer) {
            var source = new Uint8Array(buffer);
            var parts = ranges.split(",").map(function (range) {
              var bounds = range.split("-");
              var start = parseInt(bounds[0], 10);
              var end = parseInt(bounds[1], 10);

              return source.slice(start, end + 1);
            });
            var total = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
            var body = new Uint8Array(total);
            var offset = 0;

            parts.forEach(function (part) {
              body.set(part, offset);
              offset += part.length;
            });

            return new Response(body, {
              status: 200,
              headers: {
                "content-length": String(total),
                "content-type": response.headers.get("content-type") || "application/octet-stream",
              },
            });
          });
        });
      }
    } catch (error) {
      // Fall through to the browser's native fetch for non-Framer requests.
    }

    return nativeFetch(input, init);
  };
})();