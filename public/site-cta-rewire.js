// Rewrites Framer marketing CTAs into the React app and keeps internal
// nav rooted at absolute paths (paired with <base target="_top">).
(function () {
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
