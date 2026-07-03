(function () {
  if (window.__framerRangeFetchPatched) return;
  window.__framerRangeFetchPatched = true;

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var requestUrl = typeof input === "string" ? input : input && input.url;

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