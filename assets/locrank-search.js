/* LocRank client-side search — static, zero-dependency.
   Data: /directory/index.json (schema v1). Ranking signal: measured benchmark
   scores first (highest first), then untested entries A–Z. */
(function () {
  "use strict";
  var cfg = window.LOCRANK || {};
  var indexUrl = cfg.indexUrl || "/directory/index.json";
  var limit = cfg.limit || 0;
  var state = { tools: [], cats: {}, picks: {}, q: "", cat: "all", testedOnly: false, sort: "rank", compare: [] };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function scoreOf(t) { return t.test && t.test.status === "tested" ? t.test.score : null; }

  function rankSort(a, b) {
    var sa = scoreOf(a), sb = scoreOf(b);
    if (sa !== null && sb !== null) return sb - sa;
    if (sa !== null) return -1;
    if (sb !== null) return 1;
    return a.name.localeCompare(b.name);
  }
  function applySort(list) {
    var l = list.slice();
    if (state.sort === "name") l.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (state.sort === "score") l.sort(function (a, b) {
      var sa = scoreOf(a), sb = scoreOf(b);
      if (sa === null && sb === null) return a.name.localeCompare(b.name);
      if (sa === null) return 1; if (sb === null) return -1; return sb - sa;
    });
    else l.sort(rankSort);
    return l;
  }
  function matches(t) {
    if (state.cat !== "all" && t.category !== state.cat) return false;
    if (state.testedOnly && scoreOf(t) === null) return false;
    if (!state.q) return true;
    var hay = (t.name + " " + t.vendor + " " + (state.cats[t.category] || "") + " " +
      t.tagline + " " + t.best_for + " " + (t.tags || []).join(" ")).toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function badge(t) {
    var s = scoreOf(t);
    if (s !== null) {
      return '<div class="score-badge" title="Traditional Chinese Quality Benchmark score"><span class="score-num">' +
        s + '</span><span class="score-grade">Grade ' + esc(t.test.grade) + '</span>' +
        '<span class="score-lab">TCQ Benchmark</span></div>';
    }
    return '<div class="score-badge pending"><span class="score-num">—</span>' +
      '<span class="score-grade">Test pending</span><span class="score-lab">Not yet measured</span></div>';
  }
  function pickLine(t) {
    var pk = state.picks[t.slug];
    if (!pk) return "";
    return '<p style="margin:0 0 8px"><span style="display:inline-block;background:var(--yellow);color:var(--navy);font-weight:800;font-size:.72rem;letter-spacing:.06em;padding:3px 10px;border-radius:999px">\u2605 TOP PICK</span> ' +
      '<span style="font-size:.8rem;color:var(--muted)">' + esc(pk.basis) + '</span></p>';
  }
  function card(t) {
    var inCmp = state.compare.indexOf(t.slug) !== -1;
    return '<article class="card">' +
      '<div class="card-head"><h3><a href="/directory/' + esc(t.slug) + '/">' + esc(t.name) + '</a></h3>' + badge(t) + '</div>' + pickLine(t) +
      '<p class="card-meta">' + esc(t.vendor) + ' · ' + esc(state.cats[t.category] || t.category) + '</p>' +
      '<p class="card-tag">' + esc(t.tagline) + '</p>' +
      '<p class="card-price">' + esc(t.starting_price) + '</p>' +
      '<div class="card-foot"><label class="cmp"><input type="checkbox" data-cmp="' + esc(t.slug) + '"' +
      (inCmp ? " checked" : "") + '> Compare</label>' +
      '<a class="card-link" href="/directory/' + esc(t.slug) + '/">Full review →</a></div></article>';
  }
  function render() {
    var box = $("li-results"); if (!box) return;
    var list = applySort(state.tools.filter(matches));
    if (limit > 0) list = list.slice(0, limit);
    box.innerHTML = list.length ? list.map(card).join("") :
      '<p class="no-results">No tools match. Try a different keyword or category.</p>';
    var cnt = $("li-count");
    if (cnt) cnt.textContent = list.length + " of " + state.tools.length + " tools";
    renderCompare();
  }
  function renderCompare() {
    var wrap = $("li-compare"); if (!wrap) return;
    var sel = state.compare.map(function (slug) {
      return state.tools.filter(function (t) { return t.slug === slug; })[0];
    }).filter(Boolean);
    if (sel.length < 2) {
      wrap.innerHTML = sel.length === 1 ?
        '<p class="cmp-note">Select one more tool to compare side by side.</p>' : "";
      return;
    }
    function row(label, fn) {
      return "<tr><th scope='row'>" + label + "</th>" + sel.map(function (t) { return "<td>" + fn(t) + "</td>"; }).join("") + "</tr>";
    }
    wrap.innerHTML = '<h2>Comparison</h2><div class="tbl-wrap"><table class="tbl cmp-tbl"><thead><tr><th></th>' +
      sel.map(function (t) { return '<th scope="col"><a href="/directory/' + esc(t.slug) + '/">' + esc(t.name) + "</a></th>"; }).join("") +
      "</tr></thead><tbody>" +
      row("Category", function (t) { return esc(state.cats[t.category] || t.category); }) +
      row("Starting price", function (t) { return esc(t.starting_price); }) +
      row("Free tier", function (t) { return esc(t.free_tier); }) +
      row("Trial", function (t) { return esc(t.trial); }) +
      row("TCQ Benchmark score", function (t) {
        var s = scoreOf(t);
        return s !== null ? "<b>" + s + " / 100 (Grade " + esc(t.test.grade) + ")</b>" : "Test pending";
      }) +
      row("Script purity / Wording / Terminology", function (t) {
        return t.test && t.test.status === "tested" ?
          t.test.purity + " / " + t.test.wording + " / " + t.test.terminology : "—";
      }) +
      row("Best for", function (t) { return esc(t.best_for); }) +
      "</tbody></table></div>";
  }
  function bind() {
    var input = $("li-search");
    if (input) {
      input.addEventListener("input", function () { state.q = input.value.trim(); render(); });
      var form = input.closest("form");
      if (form) form.addEventListener("submit", function (e) {
        e.preventDefault();
        var r = $("li-results"); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    document.querySelectorAll("[data-cat]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.cat = el.getAttribute("data-cat");
        document.querySelectorAll("[data-cat]").forEach(function (x) {
          x.classList.toggle("active", x === el);
        });
        render();
      });
    });
    var to = $("li-tested-only");
    if (to) to.addEventListener("change", function () { state.testedOnly = to.checked; render(); });
    var so = $("li-sort");
    if (so) so.addEventListener("change", function () { state.sort = so.value; render(); });
    document.addEventListener("change", function (e) {
      var slug = e.target && e.target.getAttribute && e.target.getAttribute("data-cmp");
      if (!slug) return;
      if (e.target.checked) {
        if (state.compare.length >= 3) { e.target.checked = false; return; }
        state.compare.push(slug);
      } else {
        state.compare = state.compare.filter(function (s) { return s !== slug; });
      }
      renderCompare();
    });
    var params = new URLSearchParams(window.location.search);
    var q = params.get("q"), cat = params.get("cat");
    if (q && input) { input.value = q; state.q = q; }
    if (cat) {
      state.cat = cat;
      document.querySelectorAll("[data-cat]").forEach(function (x) {
        x.classList.toggle("active", x.getAttribute("data-cat") === cat);
      });
    }
  }
  fetch(indexUrl, { credentials: "omit" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.tools = data.tools || [];
      (data.top_picks || []).forEach(function (pk) { state.picks[pk.slug] = pk; });
      (data.categories || []).forEach(function (c) { state.cats[c.id] = c.label; });
      bind(); render();
    })
    .catch(function () {
      var box = $("li-results");
      if (box) box.innerHTML = '<p class="no-results">The index could not be loaded. Browse the <a href="/directory/">directory</a> instead.</p>';
    });
})();
