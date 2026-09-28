(function () {
  var SUPABASE_URL = "https://dvauueqtqrveqcckfrjx.supabase.co";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXV1ZXF0cXJ2ZXFjY2tmcmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTQ3NDMsImV4cCI6MjA4NzAzMDc0M30.Zpxj1of_wLzpqMDG72S00gpQPwi7kPpgrslcDfQXHV8";

  var messages = [];

  var style = document.createElement("style");
  style.textContent =
    "#fp-chat-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;" +
    "background:#b8923a;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);" +
    "z-index:99998;font-size:24px;display:flex;align-items:center;justify-content:center}" +
    "#fp-chat-panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 32px);" +
    "height:460px;max-height:70vh;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);" +
    "display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:system-ui,-apple-system,sans-serif}" +
    "#fp-chat-panel.open{display:flex}" +
    "#fp-chat-head{background:#b8923a;color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}" +
    "#fp-chat-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer}" +
    "#fp-chat-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f5f0}" +
    ".fp-msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;white-space:pre-wrap}" +
    ".fp-msg.bot{background:#fff;color:#1a1a1a;align-self:flex-start;border:1px solid #eee}" +
    ".fp-msg.user{background:#b8923a;color:#fff;align-self:flex-end}" +
    "#fp-chat-form{display:flex;border-top:1px solid #eee;padding:8px;gap:6px}" +
    "#fp-chat-input{flex:1;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;color:#1a1a1a;background:#fff}" +
    "#fp-chat-input::placeholder{color:#999}" +
    "#fp-chat-send{background:#b8923a;color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-size:13px}" +
    "#fp-chat-send:disabled{opacity:.5;cursor:default}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "fp-chat-btn";
  btn.setAttribute("aria-label", "Chat with FamePass");
  btn.textContent = "💬";

  var panel = document.createElement("div");
  panel.id = "fp-chat-panel";
  panel.innerHTML =
    '<div id="fp-chat-head"><span>FamePass Assistant</span><button id="fp-chat-close" aria-label="Close">✕</button></div>' +
    '<div id="fp-chat-body"></div>' +
    '<form id="fp-chat-form"><input id="fp-chat-input" type="text" placeholder="Ask a question..." autocomplete="off" /><button id="fp-chat-send" type="submit">Send</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var body = panel.querySelector("#fp-chat-body");
  var form = panel.querySelector("#fp-chat-form");
  var input = panel.querySelector("#fp-chat-input");
  var sendBtn = panel.querySelector("#fp-chat-send");

  function addBubble(role, text) {
    var el = document.createElement("div");
    el.className = "fp-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  addBubble("bot", "Hi! Ask me anything about how FamePass works.");

  btn.addEventListener("click", function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  });
  panel.querySelector("#fp-chat-close").addEventListener("click", function () {
    panel.classList.remove("open");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    messages.push({ role: "user", content: text });
    addBubble("user", text);
    input.value = "";
    sendBtn.disabled = true;

    fetch(SUPABASE_URL + "/functions/v1/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
      body: JSON.stringify({ messages: messages }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var reply = data.reply || data.error || "Sorry, I couldn't reach support right now.";
        messages.push({ role: "assistant", content: reply });
        addBubble("bot", reply);
      })
      .catch(function () {
        addBubble("bot", "Sorry, something went wrong. Please try again.");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  });
})();
