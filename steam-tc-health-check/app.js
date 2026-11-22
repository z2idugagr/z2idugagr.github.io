/* Steam 商店頁台繁健檢工具 — 純前端，無後端、無上傳。
計分：每種不同問題扣 5 分（100 起算，最低 0）；英文觀察項只列提醒，不扣分。
中文規則以較長詞優先比對、重疊處只算一次；low 風險規則標示「建議確認語境」。 */
(function () {
'use strict';
var FREE_LIMIT = 5;
var state = { rules: null, lastResult: null, unlocked: false};

function $(id) { return document.getElementById(id);}
function esc(s) {
return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function loadRules() {
return fetch('rules.json').then(function (r) {
if (!r.ok) throw new Error('rules.json 載入失敗');
return r.json();
}).then(function (d) { state.rules = d.rules; return d;});
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}

/* 簡體字形 → 繁體字形（僅限規則庫用到的字，避免歧義字如 面/發/干）。
逐字 1:1 轉換，長度不變，位置可直接對回原文。 */
var SIMP_MAP = {"观":"觀","视":"視","频":"頻","网":"網","络":"絡","线":"線","质":"質","价":"價","软":"軟","设":"設","录":"錄","账":"賬","户":"戶","储":"儲","运":"運","盘":"盤","显":"顯","弹":"彈","实":"實","认":"認","证":"證","满":"滿","务":"務","连":"連","联":"聯","机":"機","汉":"漢","语":"語","浏":"瀏","图":"圖","标":"標","链":"鏈","维":"維","码":"碼","页":"頁","触":"觸","荐":"薦","测":"測","馈":"饋","举":"舉","报":"報","体":"體","验":"驗","云":"雲","奖":"獎","肤":"膚","册":"冊","号":"號","递":"遞","赏":"賞","赞":"贊","论":"論","邮":"郵","档":"檔","扫":"掃","预":"預","计":"計","关":"關","内":"內","统":"統","数":"數","单":"單","优":"優","复":"復","溃":"潰","销":"銷","区":"區","转":"轉","铁":"鐵","钥":"鑰","饭":"飯","面":"麵"};
function normalize(s) {
return s.replace(/[一-鿿]/g, function (c) { return SIMP_MAP[c] || c; });
}

function check(text) {
var norm = normalize(text); // 中文規則在正規化後文本上比對（位置與原文 1:1 對應）
var zhRules = state.rules.filter(function (r) { return r.type === 'zh';})
.slice().sort(function (a, b) { return b.src.length - a.src.length;});
var enRules = state.rules.filter(function (r) { return r.type === 'en';});
var taken = []; // [start,end] 已佔用的中文比對區間
var hits = [];
function overlaps(s, e) {
for (var i = 0; i < taken.length; i++) {
if (s < taken[i][1] && e > taken[i][0]) return true;
}
return false;
}
zhRules.forEach(function (rule) {
var idx = 0, count = 0, positions = [];
while (true) {
var at = norm.indexOf(rule.src, idx);
if (at === -1) break;
if (!overlaps(at, at + rule.src.length)) {
taken.push([at, at + rule.src.length]);
positions.push(at);
count++;
}
idx = at + rule.src.length;
}
if (count > 0) hits.push({ rule: rule, count: count, positions: positions});
});
var enHits = [];
enRules.forEach(function (rule) {
var re = new RegExp('\\b' + escapeRegExp(rule.src) + '\\b', 'gi');
var m = text.match(re);
if (m) enHits.push({ rule: rule, count: m.length});
});
var distinct = hits.length;
var total = hits.reduce(function (a, h) { return a + h.count;}, 0);
var score = Math.max(0, 100 - distinct * 5);
return { score: score, distinct: distinct, total: total, hits: hits, enHits: enHits, text: text};
}

function highlight(text, hits) {
var marks = [];
hits.forEach(function (h) {
h.positions.forEach(function (p) {
marks.push({ s: p, e: p + h.rule.src.length});
});
});
marks.sort(function (a, b) { return a.s - b.s;});
var out = '', cur = 0;
marks.forEach(function (m) {
if (m.s < cur) return;
out += esc(text.slice(cur, m.s)) + '<mark>' + esc(text.slice(m.s, m.e)) + '</mark>';
cur = m.e;
});
out += esc(text.slice(cur));
return out;
}

function verdict(score) {
if (score >= 90) return '狀況良好：只有少量值得檢查的用詞。';
if (score >= 70) return '中度調整：建議逐項確認後再發布。';
if (score >= 40) return '需要較多調整：建議先改完再發布。';
return '建議全面審閱：用詞與台灣習慣落差較大。';
}

function render(result) {
state.lastResult = result;
var shown = state.unlocked? result.hits: result.hits.slice(0, FREE_LIMIT);
var hidden = result.hits.length - shown.length;
$('score').textContent = result.score;
$('verdict').textContent = verdict(result.score);
$('stats').textContent = '找到 ' + result.total + ' 處值得檢查的用詞，共 ' + result.distinct + ' 種' +
(result.enHits.length? '；另有 ' + result.enHits.length + ' 項英文翻譯注意事項': '') + '。';
$('highlighted').innerHTML = result.hits.length? highlight(result.text, result.hits): esc(result.text);
var html = '';
shown.forEach(function (h, i) {
html += '<li><strong>' + esc(h.rule.src) + '</strong> → ' + esc(h.rule.tw) +
' <span class="cnt">×' + h.count + '</span>' +
(h.rule.risk === 'low'? ' <span class="low">建議確認語境</span>': '') +
'<br><span class="note">' + esc(h.rule.note) + '</span></li>';
});
$('issueList').innerHTML = html || '<li>沒有發現常見的大陸用詞，做得好！</li>';
if (hidden > 0) {
$('gate').style.display = '';
$('gateText').textContent = '免費版顯示前 ' + FREE_LIMIT + ' 項；還有 ' + hidden + ' 種問題未展開。訂閱免費對照精華表與後續筆記（不會自動解鎖或寄出本頁其餘結果）。';
} else {
$('gate').style.display = 'none';
}
if (result.enHits.length) {
var eh = '<h3>英文原文翻譯注意事項（不扣分，僅提醒）</h3><ul>';
result.enHits.forEach(function (h) {
eh += '<li><strong>' + esc(h.rule.src) + '</strong> → ' + esc(h.rule.tw) +
' <span class="cnt">×' + h.count + '</span><br><span class="note">' + esc(h.rule.note) + '</span></li>';
});
$('enWatch').innerHTML = eh + '</ul>';
} else {
$('enWatch').innerHTML = '';
}
$('results').style.display = '';
}

function runCheck() {
var text = $('input').value;
if (!text.trim()) { $('status').textContent = '請先貼上商店頁文案。'; return;}
$('status').textContent = '';
render(check(text));
}

var DEMO = '《星塵遠征》是一款開放世界太空冒險遊戲。玩家登錄遊戲後，可在線與好友多人聯機探索星系，收集皮膚與扭蛋，參與大促活動。充值即可獲得鑽石，概率公開透明。點擊設置調整畫質，激活碼請至郵箱查收。遊戲支持手柄與觸屏操作，視頻攻略請關注公眾號。服務器穩定運行，加載速度快，新增的教程會引導新手完成第一次任務。快來下載體驗，性價比超高的季票等你來拿！';

document.addEventListener('DOMContentLoaded', function () {
loadRules().then(function (d) {
$('status').textContent = '規則庫已載入：' + d.rules.length + ' 條（中文 ' +
d.rules.filter(function (r) { return r.type === 'zh';}).length + '／英文觀察 ' +
d.rules.filter(function (r) { return r.type === 'en';}).length + '）。檢查在本機進行，文字不會上傳。';
}).catch(function (e) { $('status').textContent = '規則庫載入失敗：' + e.message;});
$('checkBtn').addEventListener('click', runCheck);
$('demoBtn').addEventListener('click', function () { $('input').value = DEMO; runCheck();});
$('clearBtn').addEventListener('click', function () {
$('input').value = ''; $('results').style.display = 'none'; $('status').textContent = '';
});
// Email 收集：由閘門內的 Systeme 託管表單連結處理（form-zh-clean，與 /free/ 同一條已驗證路徑）。
// 本頁不接收、不儲存任何 email；訂閱送免費對照精華表與後續筆記，不解鎖本頁其餘結果。
});
})();
