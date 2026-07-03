// Rewrites Framer marketing CTAs into the React app and keeps internal
// nav rooted at absolute paths (paired with <base target="_top">).
(function () {
  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var requestUrl = typeof input === "string" ? input : input && input.url;

    try {
      var url = new URL(requestUrl, window.location.href);
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

  var LOGIN = "/login";
  var SIGNUP = "/welcome";

  function rewire(root) {
    var anchors = root.querySelectorAll("a[href]");
    anchors.forEach(function (a) {
      var text = (a.textContent || "").trim().toLowerCase();
      var href = a.getAttribute("href") || "";

      // Login-like CTAs
      if (/^(log\s?in|sign\s?in)$/.test(text) || /\/login\b/.test(href)) {
        a.setAttribute("href", LOGIN);
        a.setAttribute("target", "_top");
        return;
      }
      // Signup / Get started CTAs
      if (
        /^(sign\s?up|get\s?started|join|start|try\s?free|book\s?a?\s?demo|contact\s?sales|create\s?account)$/.test(text) ||
        /\/(signup|register|get-started|join)\b/.test(href)
      ) {
        a.setAttribute("href", SIGNUP);
        a.setAttribute("target", "_top");
        return;
      }
      // Anything else pointing to root-relative Framer pages: ensure top-frame nav
      if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/assets/")) {
        a.setAttribute("target", "_top");
      }
    });

    // Buttons that Framer sometimes renders instead of <a>
    var buttons = root.querySelectorAll('button, [role="button"]');
    buttons.forEach(function (b) {
      if (b.dataset.ctaWired === "1") return;
      var text = (b.textContent || "").trim().toLowerCase();
      var target = null;
      if (/^(log\s?in|sign\s?in)$/.test(text)) target = LOGIN;
      else if (/^(sign\s?up|get\s?started|join now|start free|create account|try free|book a demo)$/.test(text)) target = SIGNUP;
      if (target) {
        b.dataset.ctaWired = "1";
        b.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.top.location.href = target;
        }, true);
      }
    });
  }

  function run() {
    rewire(document);
    var mo = new MutationObserver(function () { rewire(document); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
