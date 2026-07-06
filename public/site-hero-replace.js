(function () {
  var IMAGES = [
    "/hero-media/1.webp",
    "/hero-media/2.webp",
    "/hero-media/3.webp",
    "/hero-media/4.webp",
    "/hero-media/5.webp",
    "/hero-media/6.webp",
    "/hero-media/7.webp",
  ];

  var STYLE_ID = "famepass-hero-marquee-style";
  var MARQUEE_ID = "famepass-hero-marquee";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      "#" + MARQUEE_ID + "{",
      "  position:relative;width:100%;overflow:hidden;",
      "  padding:24px 0;",
      "  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 8%,#000 92%,transparent 100%);",
      "          mask-image:linear-gradient(90deg,transparent 0,#000 8%,#000 92%,transparent 100%);",
      "}",
      "#" + MARQUEE_ID + " .fp-track{",
      "  display:flex;gap:16px;width:max-content;",
      "  animation:fp-marquee 35s linear infinite;",
      "  will-change:transform;",
      "}",
      "#" + MARQUEE_ID + ":hover .fp-track{animation-play-state:paused;}",
      "#" + MARQUEE_ID + " .fp-card{",
      "  position:relative;flex:0 0 auto;",
      "  width:220px;height:390px;",
      "  border-radius:16px;overflow:hidden;",
      "  box-shadow:0 8px 24px rgba(0,0,0,0.12);",
      "  background:#111;",
      "}",
      "#" + MARQUEE_ID + " .fp-card img{",
      "  width:100%;height:100%;object-fit:cover;display:block;",
      "}",
      "@keyframes fp-marquee{",
      "  from{transform:translate3d(0,0,0);}",
      "  to{transform:translate3d(-50%,0,0);}",
      "}",
      "@media (max-width:640px){",
      "  #" + MARQUEE_ID + " .fp-card{width:160px;height:284px;}",
      "}",
      // hide the original framer marquee track once ours is mounted
      ".famepass-hidden{display:none !important;}",
    ].join("\n");
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function buildMarquee() {
    var wrap = document.createElement("div");
    wrap.id = MARQUEE_ID;
    var track = document.createElement("div");
    track.className = "fp-track";
    // Duplicate list so translateX(-50%) loops seamlessly
    var seq = IMAGES.concat(IMAGES);
    seq.forEach(function (src, i) {
      var card = document.createElement("div");
      card.className = "fp-card";
      var img = document.createElement("img");
      img.src = src;
      img.loading = i < IMAGES.length ? "eager" : "lazy";
      img.alt = "";
      card.appendChild(img);
      track.appendChild(card);
    });
    wrap.appendChild(track);
    return wrap;
  }

  function mount() {
    injectStyles();
    // The hero row viewport in the Framer output.
    var host = document.querySelector(".framer-d0aqv4");
    if (!host) return false;
    if (host.dataset.famepassMounted === "1") return true;
    host.dataset.famepassMounted = "1";
    // Hide original marquee children and reset the host to a plain block.
    Array.prototype.forEach.call(host.children, function (c) {
      c.classList.add("famepass-hidden");
    });
    host.style.transform = "none";
    host.style.perspective = "none";
    host.style.overflow = "visible";
    host.style.width = "100%";
    host.style.height = "auto";
    host.style.display = "block";
    host.appendChild(buildMarquee());
    return true;
  }

  function start() {
    if (mount()) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (mount() || tries > 40) clearInterval(iv);
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
