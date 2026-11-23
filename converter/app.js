// LocRank 簡轉台繁（台灣用詞）轉換器 — 詞彙層替換，檢查與轉換皆在本機進行
"use strict";
var SIMP_MAP = {"观":"觀","视":"視","频":"頻","网":"網","络":"絡","线":"線","质":"質","价":"價","软":"軟","设":"設","录":"錄","账":"賬","户":"戶","储":"儲","运":"運","盘":"盤","显":"顯","弹":"彈","实":"實","认":"認","证":"證","满":"滿","务":"務","连":"連","联":"聯","机":"機","汉":"漢","语":"語","浏":"瀏","图":"圖","标":"標","链":"鏈","维":"維","码":"碼","页":"頁","触":"觸","荐":"薦","测":"測","馈":"饋","举":"舉","报":"報","体":"體","验":"驗","云":"雲","奖":"獎","肤":"膚","册":"冊","号":"號","递":"遞","赏":"賞","赞":"贊","论":"論","邮":"郵","档":"檔","扫":"掃","预":"預","计":"計","关":"關","内":"內","统":"統","数":"數","单":"單","优":"優","复":"復","溃":"潰","销":"銷","区":"區","转":"轉","铁":"鐵","钥":"鑰","饭":"飯","面":"麵"};
function normalize(s) {
  return s.replace(/[\u4e00-\u9fff]/g, function (c) { return SIMP_MAP[c] || c; });
}
// pairs: [{from, to, note}] — 比對在正規化後文本上進行（位置與原文 1:1 對應），最長詞優先、單趟掃描
function convertText(text, pairs) {
  var norm = normalize(text);
  var sorted = pairs.slice().sort(function (a, b) { return b.from.length - a.from.length; });
  var byFirst = {};
  sorted.forEach(function (p) {
    var k = p.from.charAt(0);
    (byFirst[k] = byFirst[k] || []).push(p);
  });
  var out = "", changes = [], i = 0;
  var agg = {}, order = [];
  while (i < norm.length) {
    var cands = byFirst[norm.charAt(i)], hit = null;
    if (cands) {
      for (var j = 0; j < cands.length; j++) {
        if (norm.substr(i, cands[j].from.length) === cands[j].from) { hit = cands[j]; break; }
      }
    }
    if (hit) {
      var orig = text.substr(i, hit.from.length);
      out += hit.to;
      if (orig !== hit.to) {
        var key = hit.from + "→" + hit.to;
        if (!agg[key]) { agg[key] = { fromShown: orig, from: hit.from, to: hit.to, note: hit.note, count: 0 }; order.push(key); }
        agg[key].count++;
      }
      i += hit.from.length;
    } else {
      out += text.charAt(i);
      i += 1;
    }
  }
  order.forEach(function (k) { changes.push(agg[k]); });
  return { converted: out, changes: changes };
}

var PAIRS = null;
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function render(text) {
  var r = convertText(text, PAIRS);
  var total = r.changes.reduce(function (a, c) { return a + c.count; }, 0);
  var summary = document.getElementById("summary");
  var preview = document.getElementById("preview");
  var hits = document.getElementById("hits");
  summary.style.display = "block";
  if (total === 0) {
    summary.innerHTML = "No Mainland terms found — <span class='n'>0</span> changes. 這段文字沒有命中詞庫裡的大陸用詞（詞庫共 " + PAIRS.length + " 組；沒命中不代表用詞百分之百道地，語感與句構仍建議真人確認）。";
    preview.style.display = "none"; hits.style.display = "none";
    document.getElementById("copyBtn").style.display = "none";
    return;
  }
  summary.innerHTML = "Made <span class='n'>" + total + "</span> change" + (total > 1 ? "s" : "") + " (" + r.changes.length + " term" + (r.changes.length > 1 ? "s" : "") + ") — 共改了 " + total + " 處。轉換後全文如下，變更處已標色；逐項清單在下方。";
  // 帶標色的轉換結果：重新掃描一次取得區間
  var norm = normalize(text);
  var sorted = PAIRS.slice().sort(function (a, b) { return b.from.length - a.from.length; });
  var byFirst = {};
  sorted.forEach(function (p) { var k = p.from.charAt(0); (byFirst[k] = byFirst[k] || []).push(p); });
  var html = "", i = 0;
  while (i < norm.length) {
    var cands = byFirst[norm.charAt(i)], hit = null;
    if (cands) { for (var j = 0; j < cands.length; j++) { if (norm.substr(i, cands[j].from.length) === cands[j].from) { hit = cands[j]; break; } } }
    if (hit) {
      var orig = text.substr(i, hit.from.length);
      html += (orig !== hit.to) ? "<mark>" + esc(hit.to) + "</mark>" : esc(hit.to);
      i += hit.from.length;
    } else { html += esc(text.charAt(i)); i += 1; }
  }
  preview.innerHTML = html;
  preview.style.display = "block";
  hits.innerHTML = r.changes.map(function (c) {
    return "<div class='hit'><span class='w'>" + esc(c.fromShown) + "</span> → <span class='r'>" + esc(c.to) + "</span>" +
      (c.count > 1 ? " <span class='cnt'>× " + c.count + " 處</span>" : "") +
      (c.note ? "<div class='note'>" + esc(c.note) + "</div>" : "") + "</div>";
  }).join("");
  hits.style.display = "block";
  var cp = document.getElementById("copyBtn");
  cp.style.display = "inline-block";
  cp.setAttribute("data-text", r.converted);
}
function init() {
  fetch("vocab.json").then(function (res) { return res.json(); }).then(function (data) {
    PAIRS = data.pairs;
    document.getElementById("status").textContent = "";
    document.getElementById("convertBtn").disabled = false;
  }).catch(function () {
    document.getElementById("status").textContent = "詞庫載入失敗，請重新整理頁面再試。";
  });
  document.getElementById("convertBtn").addEventListener("click", function () {
    var t = document.getElementById("input").value;
    if (!PAIRS) return;
    if (!t.trim()) { document.getElementById("status").textContent = "先貼上文字，再按轉換。"; return; }
    document.getElementById("status").textContent = "";
    render(t);
  });
  document.getElementById("sampleBtn").addEventListener("click", function () {
    document.getElementById("input").value = "這款軟件的視頻質量很好，支持在線搜索、打印和網絡登錄；用戶登錄賬戶後，可以查看信息、接收短信通知，還能設置默認屏幕亮度。";
  });
  document.getElementById("clearBtn").addEventListener("click", function () {
    document.getElementById("input").value = "";
    document.getElementById("summary").style.display = "none";
    document.getElementById("preview").style.display = "none";
    document.getElementById("hits").style.display = "none";
    document.getElementById("copyBtn").style.display = "none";
  });
  document.getElementById("copyBtn").addEventListener("click", function () {
    var t = this.getAttribute("data-text") || "";
    var btn = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { btn.textContent = "已複製 ✓"; setTimeout(function () { btn.textContent = "複製轉換後全文"; }, 1600); });
    }
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}
if (typeof module !== "undefined" && module.exports) { module.exports = { convertText: convertText, normalize: normalize }; }
