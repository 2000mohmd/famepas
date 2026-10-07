(function () {
  var grid = document.querySelector(".fp-cats");
  var templates = grid ? Array.from(grid.querySelectorAll(".fp-tile")) : [];
  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || !event.data || event.data.type !== "website-categories" || !Array.isArray(event.data.categories)) return;
    if (!grid || !templates.length) return;
    grid.querySelectorAll(".fp-tile").forEach(function (tile) { tile.remove(); });
    event.data.categories.forEach(function (category, index) {
      var match = templates.find(function (tile) {
        return tile.querySelector(".fp-ph + span > span > span").textContent.toLowerCase() === category.name.toLowerCase();
      });
      var tile = (match || templates[0]).cloneNode(true);
      var title = tile.querySelector(".fp-ph + span > span > span");
      title.textContent = category.name;
      var caption = title.nextElementSibling;
      if (!match && caption) caption.textContent = "Discover new experiences.";
      var number = tile.querySelector(".fp-ph + span > span:last-child");
      if (number) number.textContent = String(index + 1).padStart(2, "0");
      var image = tile.querySelector("img");
      if (category.image_url && /^https?:\/\//.test(category.image_url)) image.src = category.image_url;
      image.alt = category.name;
      image.loading = "lazy";
      grid.insertBefore(tile, grid.lastElementChild);
    });
    var description = document.querySelector("#experiences > div > div > p");
    if (description) description.textContent = "Venues across Lebanon, each one looking for creators to tell its story.";
  });
  if (window.parent !== window) window.parent.postMessage({ type: "website-ready" }, window.location.origin);
})();