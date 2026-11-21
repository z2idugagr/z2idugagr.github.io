/**
 * LocRank AI 助理 — 前端聊天泡泡
 * 原生 JS、無框架、無外部相依。貼法見 SNIPPET.md。
 *
 * 設定方式（二擇一）：
 *   <script src="widget.js" data-api="https://hankloc-ai-support.xxx.workers.dev"></script>
 *   或先設 window.HANKLOC_CHAT_API = "https://..." 再載入本檔。
 */
(function () {
  "use strict";

  var scriptTag = document.currentScript;
  var API =
    (scriptTag && scriptTag.getAttribute("data-api")) ||
    window.HANKLOC_CHAT_API ||
    "";
  if (!API) {
    if (window.console) console.warn("[LocRank chat] API base URL not configured.");
    return;
  }
  API = API.replace(/\/+$/, "");

  var BRAND = {
    navy: "#0d2b52",
    navyDark: "#081e3a",
    accent: "#ffc61a",
    bg: "#ffffff",
    soft: "#f2f5f9",
    text: "#1c2733",
    muted: "#6b7a8c",
  };

  var css = [
    ".hls-root{position:fixed;right:20px;bottom:20px;z-index:99990;font-family:-apple-system,'Segoe UI','PingFang TC','Microsoft JhengHei',sans-serif;color:" + BRAND.text + "}",
    ".hls-bubble{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:" + BRAND.navy + ";box-shadow:0 6px 20px rgba(8,30,58,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}",
    ".hls-bubble:hover{transform:scale(1.06)}",
    ".hls-bubble svg{width:28px;height:28px;fill:" + BRAND.accent + "}",
    ".hls-panel{position:absolute;right:0;bottom:72px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:" + BRAND.bg + ";border-radius:14px;box-shadow:0 12px 40px rgba(8,30,58,.30);display:none;flex-direction:column;overflow:hidden}",
    ".hls-panel.hls-open{display:flex}",
    ".hls-head{background:" + BRAND.navy + ";color:#fff;padding:14px 16px}",
    ".hls-head .hls-title{font-size:16px;font-weight:700;margin:0}",
    ".hls-head .hls-sub{font-size:12px;color:" + BRAND.accent + ";margin:2px 0 0}",
    ".hls-msgs{flex:1;overflow-y:auto;padding:12px;background:" + BRAND.soft + ";display:flex;flex-direction:column;gap:8px}",
    ".hls-msg{max-width:82%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}",
    ".hls-msg.hls-bot{background:#fff;border:1px solid #dde4ec;border-bottom-left-radius:4px;align-self:flex-start}",
    ".hls-msg.hls-user{background:" + BRAND.navy + ";color:#fff;border-bottom-right-radius:4px;align-self:flex-end}",
    ".hls-msg.hls-err{background:#fdecec;border:1px solid #f3c2c2;color:#8c2b2b;align-self:flex-start}",
    ".hls-leadbar{padding:8px 12px;background:#fff;border-top:1px solid #e4eaf1;text-align:center}",
    ".hls-leadbar button{background:none;border:none;color:" + BRAND.navy + ";font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline}",
    ".hls-lead{display:none;padding:12px;background:#fff;border-top:1px solid #e4eaf1}",
    ".hls-lead.hls-open{display:block}",
    ".hls-lead input,.hls-lead textarea{width:100%;box-sizing:border-box;margin:0 0 8px;padding:8px 10px;border:1px solid #c9d4e0;border-radius:8px;font-size:14px;font-family:inherit}",
    ".hls-lead textarea{height:64px;resize:vertical}",
    ".hls-lead .hls-send{width:100%;background:" + BRAND.accent + ";color:" + BRAND.navyDark + ";border:none;border-radius:8px;padding:9px;font-size:14px;font-weight:700;cursor:pointer}",
    ".hls-inputbar{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e4eaf1}",
    ".hls-inputbar input{flex:1;padding:10px 12px;border:1px solid #c9d4e0;border-radius:20px;font-size:14px;font-family:inherit;outline:none}",
    ".hls-inputbar input:focus{border-color:" + BRAND.navy + "}",
    ".hls-inputbar button{background:" + BRAND.navy + ";color:#fff;border:none;border-radius:20px;padding:0 18px;font-size:14px;font-weight:600;cursor:pointer}",
    ".hls-inputbar button:disabled{opacity:.5;cursor:default}",
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.className = "hls-root";

  var panel = document.createElement("div");
  panel.className = "hls-panel";

  var head = document.createElement("div");
  head.className = "hls-head";
  var title = document.createElement("p");
  title.className = "hls-title";
  title.textContent = "LocRank AI Assistant";
  var sub = document.createElement("p");
  sub.className = "hls-sub";
  sub.textContent = "Find & compare localization tools · test-based scores · EN ↔ Traditional Chinese services";
  head.appendChild(title);
  head.appendChild(sub);

  var msgs = document.createElement("div");
  msgs.className = "hls-msgs";

  var leadbar = document.createElement("div");
  leadbar.className = "hls-leadbar";
  var leadToggle = document.createElement("button");
  leadToggle.type = "button";
  leadToggle.textContent = "Need a human reply? Leave your details 留資料給專人";
  leadbar.appendChild(leadToggle);

  var leadForm = document.createElement("div");
  leadForm.className = "hls-lead";
  var inName = document.createElement("input");
  inName.type = "text";
  inName.placeholder = "Your name 稱呼";
  inName.maxLength = 100;
  var inEmail = document.createElement("input");
  inEmail.type = "email";
  inEmail.placeholder = "Email";
  inEmail.maxLength = 200;
  var inNeed = document.createElement("textarea");
  inNeed.placeholder = "What do you need? （工具諮詢／翻譯・在地化需求、字數、希望交期…）";
  inNeed.maxLength = 2000;
  var leadSend = document.createElement("button");
  leadSend.type = "button";
  leadSend.className = "hls-send";
  leadSend.textContent = "Send 送出";
  leadForm.appendChild(inName);
  leadForm.appendChild(inEmail);
  leadForm.appendChild(inNeed);
  leadForm.appendChild(leadSend);

  var inputbar = document.createElement("div");
  inputbar.className = "hls-inputbar";
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask about tools, scores or services… 輸入問題";
  input.maxLength = 1000;
  var sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "Send";
  inputbar.appendChild(input);
  inputbar.appendChild(sendBtn);

  panel.appendChild(head);
  panel.appendChild(msgs);
  panel.appendChild(leadbar);
  panel.appendChild(leadForm);
  panel.appendChild(inputbar);

  var bubble = document.createElement("button");
  bubble.className = "hls-bubble";
  bubble.setAttribute("aria-label", "Open LocRank AI assistant 開啟 LocRank AI 客服");
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.7 1.5 5.2 3.9 6.8-.1 1-.5 2.3-1.2 3.3 0 0 2.9-.2 5-1.7.7.2 1.5.3 2.3.3 5.5 0 10-3.9 10-8.7S17.5 3 12 3z"/></svg>';

  root.appendChild(panel);
  root.appendChild(bubble);
  document.body.appendChild(root);

  var history = [];
  var greeted = false;

  function addMsg(text, cls) {
    var d = document.createElement("div");
    d.className = "hls-msg " + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function togglePanel() {
    var open = panel.classList.toggle("hls-open");
    if (open && !greeted) {
      greeted = true;
      addMsg(
        "Hi! I'm the LocRank assistant. Ask me to find or compare localization tools, explain our test-based scores (e.g. the Traditional Chinese Quality Benchmark), or about translation / localization services — EN ↔ Traditional Chinese, with a free one-page trial. I reply in your language.\n你好！也可以用繁體中文問我：工具推薦、實測分數，或翻譯／在地化服務都可以。",
        "hls-bot"
      );
    }
    if (open) input.focus();
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg(text, "hls-user");
    sendBtn.disabled = true;
    var pending = addMsg("…", "hls-bot");
    fetch(API + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || "http " + r.status);
          return data;
        });
      })
      .then(function (data) {
        pending.textContent = data.reply || "(No reply content)";
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: data.reply || "" });
        if (history.length > 20) history = history.slice(-20);
      })
      .catch(function () {
        pending.className = "hls-msg hls-err";
        pending.textContent =
          "Sorry, the assistant is temporarily unavailable. Please try again later, or email hello@hankloc.com.\n抱歉，客服暫時連不上，請稍後再試，或直接寫信到 hello@hankloc.com。";
      })
      .then(function () {
        sendBtn.disabled = false;
        msgs.scrollTop = msgs.scrollHeight;
        input.focus();
      });
  }

  function sendLead() {
    var name = inName.value.trim();
    var email = inEmail.value.trim();
    var need = inNeed.value.trim();
    if (!name || !email || !need) {
      addMsg("Please fill in your name, email and a short description. 請填寫稱呼、Email 和需求簡述。", "hls-err");
      panel.classList.add("hls-open");
      return;
    }
    leadSend.disabled = true;
    leadSend.textContent = "Sending… 送出中";
    fetch(API + "/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, need: need }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function () {
        leadForm.classList.remove("hls-open");
        inName.value = inEmail.value = inNeed.value = "";
        addMsg(
          "Thanks — your details are in. Hank will reply on a weekday evening.\n已收到您的資料，Hank 會在平日晚間回覆您。",
          "hls-bot"
        );
      })
      .catch(function () {
        addMsg(
          "Couldn't send your details — please email hello@hankloc.com directly.\n留資料送出失敗，請直接寫信到 hello@hankloc.com，謝謝。",
          "hls-err"
        );
      })
      .then(function () {
        leadSend.disabled = false;
        leadSend.textContent = "Send 送出";
      });
  }

  bubble.addEventListener("click", togglePanel);
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });
  leadToggle.addEventListener("click", function () {
    leadForm.classList.toggle("hls-open");
  });
  leadSend.addEventListener("click", sendLead);
})();
