/**
 * LocRank 語言切換器 — 每頁一語言、隨時可切換。
 * 作法：Google Translate 元件（cookie 驅動），自製選單 UI；
 * 選單與註記一律顯示「目前語言」，不混雜兩種語言。
 * 按鈕常駐；元件慢載時自動重試（v2）。
 */
(function () {
  "use strict";
  if (window.__lrLangSwitch) return;
  window.__lrLangSwitch = true;

  var LANGS = [
    ["en", "English"],
    ["zh-TW", "繁體中文"],
    ["zh-CN", "简体中文"],
    ["ja", "日本語"],
    ["ko", "한국어"],
    ["es", "Español"],
    ["fr", "Français"],
    ["de", "Deutsch"],
    ["pt", "Português"],
    ["ru", "Русский"],
    ["it", "Italiano"],
    ["pl", "Polski"],
    ["nl", "Nederlands"],
    ["uk", "Українська"],
    ["vi", "Tiếng Việt"],
    ["th", "ไทย"],
    ["id", "Bahasa Indonesia"],
    ["ar", "العربية"],
    ["hi", "हिन्दी"],
    ["tr", "Türkçe"]
  ];
  var NOTE = {
    "en": "Machine translation — for reading convenience.",
    "zh-TW": "機器翻譯 — 僅供閱讀方便。",
    "zh-CN": "机器翻译 — 仅供阅读方便。",
    "ja": "機械翻訳（閲覧用）",
    "ko": "기계 번역 — 읽기 편의용입니다.",
    "es": "Traducción automática — solo para lectura.",
    "fr": "Traduction automatique — pour la lecture.",
    "de": "Maschinelle Übersetzung — nur zum Lesen.",
    "pt": "Tradução automática — apenas para leitura.",
    "ru": "Машинный перевод — только для чтения.",
    "it": "Traduzione automatica — solo per lettura.",
    "pl": "Tłumaczenie maszynowe — tylko do czytania.",
    "nl": "Machinevertaling — alleen om te lezen.",
    "uk": "Машинний переклад — лише для читання.",
    "vi": "Dịch máy — chỉ để đọc.",
    "th": "แปลโดยเครื่อง — สำหรับอ่านเท่านั้น",
    "id": "Terjemahan mesin — hanya untuk membaca.",
    "ar": "ترجمة آلية — للقراءة فقط.",
    "hi": "मशीन अनुवाद — केवल पढ़ने के लिए।",
    "tr": "Makine çevirisi — yalnızca okuma amaçlıdır."
  };

  function norm(code) {
    if (!code) return "en";
    code = code.replace("_", "-");
    var lower = code.toLowerCase();
    if (lower === "zh-hant" || lower === "zh-hant-tw" || lower === "zh-tw") return "zh-TW";
    if (lower === "zh-hans" || lower === "zh-cn" || lower === "zh") return "zh-CN";
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i][0].toLowerCase() === lower) return LANGS[i][0];
    }
    return code.split("-")[0];
  }

  var SRC = norm(document.documentElement.getAttribute("lang") || "en");

  function readCookie() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!m) return null;
    var parts = decodeURIComponent(m[1]).split("/");
    // 格式 /來源/目標
    if (parts.length >= 3 && parts[2]) return norm(parts[2]);
    return null;
  }
  var CUR = readCookie() || SRC;

  function nameOf(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return LANGS[i][1];
    return code;
  }

  function cookieDomains() {
    var host = location.hostname;
    var list = [null];
    var labels = host.split(".");
    if (labels.length === 2) list.push("." + host);
    return list;
  }
  function setTransCookie(target) {
    var val = target === SRC ? "" : "/" + SRC + "/" + target;
    var domains = cookieDomains();
    for (var i = 0; i < domains.length; i++) {
      var s = "googtrans=" + val + "; path=/; max-age=" + (val ? 31536000 : 0);
      if (domains[i]) s += "; domain=" + domains[i];
      document.cookie = s;
    }
  }

  // ---- UI ----
  var css = [
    ".lr-lang{position:fixed;left:16px;bottom:16px;z-index:99980;font-family:-apple-system,'Segoe UI','PingFang TC','Microsoft JhengHei',sans-serif}",
    ".lr-lang-btn{display:flex;align-items:center;gap:7px;background:#10201E;color:#fff;border:1px solid rgba(45,212,191,.55);border-radius:999px;padding:9px 14px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(16,32,30,.35)}",
    ".lr-lang-btn:hover{border-color:#2DD4BF}",
    ".lr-lang-btn svg{width:15px;height:15px;fill:#2DD4BF;flex:none}",
    ".lr-lang-panel{position:absolute;left:0;bottom:52px;width:218px;max-height:46vh;overflow-y:auto;background:#fff;border:1px solid #dfe7e4;border-radius:12px;box-shadow:0 14px 44px rgba(16,32,30,.28);display:none;padding:6px}",
    ".lr-lang-panel.lr-open{display:block}",
    ".lr-lang-item{display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;background:none;border:none;border-radius:8px;padding:8px 10px;font-size:14px;color:#1c2733;cursor:pointer}",
    ".lr-lang-item:hover{background:#eef6f4}",
    ".lr-lang-item.lr-active{font-weight:700;color:#0b6e5d}",
    ".lr-lang-item .lr-check{color:#2DD4BF;font-weight:700}",
    ".lr-lang-note{padding:8px 10px 6px;font-size:11px;line-height:1.5;color:#6b7a8c;border-top:1px solid #eef2f0;margin-top:4px}",
    ".goog-te-banner-frame{display:none!important}",
    "body{top:0!important}",
    "#google_translate_element{position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden}",
    ".goog-te-gadget{font-size:0!important}",
    "font.goog-text-highlight{background:none!important;box-shadow:none!important}"
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.className = "lr-lang notranslate";
  root.setAttribute("translate", "no");

  var btn = document.createElement("button");
  btn.className = "lr-lang-btn";
  btn.type = "button";
  btn.setAttribute("aria-haspopup", "true");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 6h-3.1a15.6 15.6 0 0 0-1.3-3.3A8.03 8.03 0 0 1 19.9 8zM12 4.1c.9 1.2 1.9 2.9 2.4 3.9h-4.8c.5-1 1.5-2.7 2.4-3.9zM4.1 16a8.2 8.2 0 0 1 0-8h3.4a17 17 0 0 0 0 8H4.1zm.9 2h3.1c.3 1.2.8 2.3 1.3 3.3A8.03 8.03 0 0 1 5 18zm3.1-10a15.4 15.4 0 0 0 0 8h3.3a26 26 0 0 1 0-8H8.1zM12 19.9c-.9-1.2-1.9-2.9-2.4-3.9h4.8c-.5 1-1.5 2.7-2.4 3.9zm2.5-5.9H9.5a24 24 0 0 1 0-4h5a24 24 0 0 1 0 4zm.9 7.3c.5-1 1-2.1 1.3-3.3H20a8.03 8.03 0 0 1-4.6 3.3zm1.5-5.3a15.4 15.4 0 0 0 0-8h3.4a8.2 8.2 0 0 1 0 8h-3.4z"/></svg>' +
    "<span>" + nameOf(CUR) + "</span><span aria-hidden=\"true\">▾</span>";

  var panel = document.createElement("div");
  panel.className = "lr-lang-panel";
  panel.setAttribute("role", "menu");

  LANGS.forEach(function (pair) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "lr-lang-item" + (pair[0] === CUR ? " lr-active" : "");
    item.setAttribute("role", "menuitem");
    item.innerHTML = "<span>" + pair[1] + "</span>" + (pair[0] === CUR ? '<span class="lr-check">✓</span>' : "");
    item.addEventListener("click", function () {
      if (pair[0] === CUR) { panel.classList.remove("lr-open"); return; }
      setTransCookie(pair[0]);
      location.reload();
    });
    panel.appendChild(item);
  });
  var note = document.createElement("div");
  note.className = "lr-lang-note";
  note.textContent = NOTE[CUR] || NOTE.en;
  panel.appendChild(note);

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    panel.classList.toggle("lr-open");
  });
  document.addEventListener("click", function (e) {
    if (!root.contains(e.target)) panel.classList.remove("lr-open");
  });

  root.appendChild(panel);
  root.appendChild(btn);

  var gtDiv = document.createElement("div");
  gtDiv.id = "google_translate_element";

  function mount() {
    document.body.appendChild(gtDiv);
    document.body.appendChild(root);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  // ---- Google Translate 元件 ----
  // 按鈕常駐：元件慢載或被擋時按鈕仍在，cookie 先行、元件起來即生效。
  // （v1 的逾時隱藏會讓按鈕在慢網環境消失，經真瀏覽器實測退回，v2 移除。）
  var gtReady = false;
  window.__lrGoogleTranslateInit = function () {
    try {
      new window.google.translate.TranslateElement(
        { pageLanguage: SRC, autoDisplay: false },
        "google_translate_element"
      );
      gtReady = true;
    } catch (e) { /* 失敗走重試 */ }
  };
  var gtAttempts = 0;
  function loadGt() {
    gtAttempts++;
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=__lrGoogleTranslateInit";
    s.async = true;
    document.head.appendChild(s);
    setTimeout(function () {
      if (!gtReady && gtAttempts < 3) loadGt();
    }, 4000);
  }
  loadGt();
})();
