(function () {
  var NEW = [
    "/hero-media/1.webp",
    "/hero-media/2.webp",
    "/hero-media/3.webp",
    "/hero-media/4.webp",
    "/hero-media/5.webp",
    "/hero-media/6.webp",
    "/hero-media/7.webp",
  ];
  // Original hero image filename stems (order matters — matches on-screen order).
  var MAP = {
    "Oc4u9Niax5mxspYf7NtlRf8rTQ": NEW[0],
    "SspwXOWG9R2ajvT1FK7A10pbM": NEW[1],
    "E5ywdaY2xPYvrEREKd0xJaUrYNQ": NEW[2],
    "dYb3uSROhXXu6yoE8S45beqYxY": NEW[3],
    "FCHc0YVe7uWPeTDnGf2Ikw4NTBQ": NEW[4],
    "rroglcUi7QzS9qE4ag2H4AC7MSg": NEW[5],
    "yj7ufNwEYQH4gh1IkCwa60rDEY": NEW[6],
    "SaZZU3Py7zXCfNcqQ3mj26jgN4": NEW[0],
  };
  function pick(url) {
    if (!url) return null;
    for (var k in MAP) if (url.indexOf(k) !== -1) return MAP[k];
    return null;
  }
  function fix(img) {
    var replacement = pick(img.getAttribute("src")) || pick(img.currentSrc);
    if (!replacement) return;
    if (img.dataset.heroReplaced === replacement) return;
    img.dataset.heroReplaced = replacement;
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.setAttribute("src", replacement);
    img.style.objectFit = "cover";
    // Neutralize <picture> siblings
    var parent = img.parentElement;
    if (parent && parent.tagName === "PICTURE") {
      parent.querySelectorAll("source").forEach(function (s) { s.remove(); });
    }
  }
  function scan(root) {
    (root || document).querySelectorAll("img").forEach(fix);
  }
  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === "attributes" && m.target.tagName === "IMG") fix(m.target);
      m.addedNodes && m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === "IMG") fix(n);
        else scan(n);
      });
    }
  });
  function start() {
    scan(document);
    mo.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ["src", "srcset"],
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

// Joli-style card polish: rounded corners, drop shadow, alternating gentle tilt,
// and counter-skew so each card reads upright while the marquee still drifts.
(function injectJoliStyles(){
  if (document.getElementById('joli-hero-style')) return;
  var css = `
    .framer-8izlk2 {
      border-radius: 22px !important;
      overflow: hidden !important;
      box-shadow: 0 30px 50px -18px rgba(0,0,0,0.45), 0 10px 20px -10px rgba(0,0,0,0.28) !important;
    }
    .framer-8izlk2 img { border-radius: 22px !important; }
    /* Make each card upright (cancel the marquee wrapper's rotate+skew),
       with a gentle alternating tilt and breathing space between cards. */
    [class*="framer-"][class$="-container"] > .framer-ARkFZ {
      transform: skewX(-17deg) rotate(-17deg) !important;
      transform-origin: center center !important;
      padding: 0 12px !important;
      box-sizing: border-box !important;
    }
    .framer-8cnfuk [class*="-container"]:nth-child(odd)  > .framer-ARkFZ { transform: rotate(-3deg) skewX(-17deg) rotate(-17deg) !important; }
    .framer-8cnfuk [class*="-container"]:nth-child(even) > .framer-ARkFZ { transform: rotate(3deg)  skewX(-17deg) rotate(-17deg) !important; }
  `;
  var s = document.createElement('style');
  s.id = 'joli-hero-style';
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);
})();
