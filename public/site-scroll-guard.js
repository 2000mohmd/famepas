// Prevents Framer's router/hydration from snapping the page back to the
// top ~1s after load once the user has started scrolling manually.
(function () {
  if (window.__famepassScrollGuard) return;
  window.__famepassScrollGuard = true;

  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch (e) {}

  var userScrolled = false;
  var markScrolled = function () {
    userScrolled = true;
  };

  // Any of these signals mean the user is actively driving the scroll
  // position themselves, so programmatic resets should stop afterwards.
  window.addEventListener("wheel", markScrolled, { passive: true, capture: true });
  window.addEventListener("touchmove", markScrolled, { passive: true, capture: true });
  window.addEventListener(
    "keydown",
    function (e) {
      var keys = ["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "];
      if (keys.indexOf(e.key) !== -1) markScrolled();
    },
    true
  );
  window.addEventListener(
    "scroll",
    function () {
      // Ignore the very first scroll events caused by the browser
      // restoring position or Framer laying out the page; only treat it
      // as "user scrolled" once we've observed a real, sustained position.
      if (window.scrollY > 40) userScrolled = true;
    },
    { passive: true, capture: true }
  );

  var nativeScrollTo = window.scrollTo.bind(window);
  var nativeScroll = window.scroll.bind(window);

  function isTopReset(x, y) {
    return (x === 0 || x === undefined) && (y === 0 || y === undefined);
  }

  function guardedScroll(native) {
    return function () {
      if (userScrolled) {
        if (arguments.length === 0) return;
        if (arguments.length === 1 && typeof arguments[0] === "object") {
          var opts = arguments[0] || {};
          if (isTopReset(opts.left, opts.top)) return;
        } else if (arguments.length >= 2) {
          if (isTopReset(arguments[0], arguments[1])) return;
        }
      }
      return native.apply(window, arguments);
    };
  }

  try {
    window.scrollTo = guardedScroll(nativeScrollTo);
    window.scroll = guardedScroll(nativeScroll);
  } catch (e) {}

  // Some Framer builds reset scroll by writing directly to
  // documentElement.scrollTop / body.scrollTop instead of calling
  // window.scrollTo. Guard those property setters too.
  [document.documentElement, document.body].forEach(function (node) {
    if (!node) return;
    var proto = Object.getPrototypeOf(node);
    var desc =
      Object.getOwnPropertyDescriptor(node, "scrollTop") ||
      Object.getOwnPropertyDescriptor(proto, "scrollTop") ||
      Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
    if (!desc || !desc.set || !desc.get) return;
    try {
      Object.defineProperty(node, "scrollTop", {
        configurable: true,
        enumerable: desc.enumerable,
        get: function () {
          return desc.get.call(this);
        },
        set: function (v) {
          if (userScrolled && v === 0 && desc.get.call(this) > 40) return;
          desc.set.call(this, v);
        },
      });
    } catch (e) {}
  });
})();
