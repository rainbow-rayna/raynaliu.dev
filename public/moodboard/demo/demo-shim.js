/**
 * Read-only demo shim.
 *
 * The Moodboard client funnels every server call through one `fetch('/api'…)`,
 * so intercepting fetch is enough to run the whole UI off a static snapshot —
 * no changes to the app's own source, and no server to host.
 *
 * The boards in boards.json are real: those tags came back from Gemini during
 * an actual upload, they're just baked ahead of time rather than generated at
 * page load. Writes are refused with a message the UI already knows how to show.
 */
(function () {
  var SNAPSHOT = null;
  var ready = fetch("/moodboard/demo/boards.json")
    .then(function (r) { return r.json(); })
    .then(function (d) { SNAPSHOT = d; })
    .catch(function () { SNAPSHOT = { current: null, weeks: {} }; });

  var DAYS = ["mon", "tue", "wed", "thu", "fri", "weekend"];

  function json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "content-type": "application/json" },
    });
  }

  function readOnly() {
    return json({
      error: {
        code: "demo_read_only",
        message: "This is a read-only demo — uploads and edits are disabled. Clone the repo to run it with your own Gemini key.",
      },
    }, 403);
  }

  // ISO-week math, enough to label a week the snapshot doesn't contain
  function shiftWeek(key, delta) {
    var y = parseInt(key.slice(0, 4), 10), w = parseInt(key.slice(6), 10) + delta;
    if (w < 1) { y -= 1; w += 52; }
    if (w > 52) { y += 1; w -= 52; }
    return y + "-W" + String(w).padStart(2, "0");
  }

  function emptyBoard(key) {
    var entries = {};
    DAYS.forEach(function (d, i) { entries[d] = { id: -(i + 1), weekId: -1, day: d, images: [] }; });
    return {
      week: { id: -1, weekKey: key, year: +key.slice(0, 4), weekNumber: +key.slice(6),
              startDate: null, endDate: null },
      entries: entries,
      notes: { id: -1, weekId: -1, body: "", height: 220, updatedAt: new Date().toISOString() },
    };
  }

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();

    if (url.indexOf("/api/") !== 0 && url.indexOf("/api") !== 0) return nativeFetch(input, init);
    if (method !== "GET") return Promise.resolve(readOnly());

    return ready.then(function () {
      var path = url.replace(/^\/api/, "").split("?")[0];

      if (path === "/weeks/current") {
        var k = SNAPSHOT.current;
        if (!k) return json({ error: { code: "no_data", message: "No demo data." } }, 404);
        return json({ weekKey: k, previousWeekKey: shiftWeek(k, -1), nextWeekKey: shiftWeek(k, 1) });
      }

      var m = path.match(/^\/weeks\/([^/]+)$/);
      if (m) {
        var key = m[1];
        return json(SNAPSHOT.weeks[key] || emptyBoard(key));
      }

      return json({ error: { code: "not_in_demo", message: "Not available in the demo." } }, 404);
    });
  };
})();
