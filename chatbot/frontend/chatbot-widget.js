/**
 * Zikos · Karriere-Chatbot Widget
 * Schlanker, lazy-loadbarer Chat-Loader für die Portfolio-Seite.
 *
 * Einbindung:
 *   <script src="https://DEINE-DOMAIN/widget/chatbot-widget.js" async></script>
 *   <script>
 *     window.ZikosBot && ZikosBot.init({ backendUrl: "https://DEINE-DOMAIN" });
 *   </script>
 *
 * Hinweis: Das Widget lädt das Stylesheet erst beim ersten Öffnen.
 */
(function () {
    'use strict';
    if (window.ZikosBot) return;

    var config = {
        backendUrl: "http://localhost:8091",
        title: "Karriere-Bot · Zikos",
        cssUrl: null,
    };
    var sessionId = "";
    var isOpen = false;
    var rendered = false;
    var welcomed = false;

    function genId() {
        return "zz_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
    }

    function loadCss() {
        if (document.getElementById("zz-bot-css")) return;
        var base = config.backendUrl.replace(/\/$/, "");
        var url = config.cssUrl || (base + "/widget/chatbot-widget.css?v=1");
        var link = document.createElement("link");
        link.id = "zz-bot-css";
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
    }

    function init(userConfig) {
        config = Object.assign(config, userConfig || {});
        sessionId = genId();
        loadCss();
        renderToggle();
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && isOpen) toggleChat();
        });
    }

    function renderToggle() {
        if (document.getElementById("zz-bot-toggle")) return;
        var toggle = document.createElement("button");
        toggle.className = "zz-bot-toggle";
        toggle.id = "zz-bot-toggle";
        toggle.setAttribute("aria-label", "Karriere-Bot öffnen");
        toggle.innerHTML = iconBubble() + '<span class="zz-bot-toggle__label">KI-Berater</span>';
        toggle.onclick = toggleChat;
        document.body.appendChild(toggle);
    }

    function renderWindow() {
        if (rendered) return;
        loadCss();
        var win = document.createElement("div");
        win.className = "zz-bot-window";
        win.id = "zz-bot-window";
        win.innerHTML = ''
            + '<div class="zz-bot-header">'
            +   '<div class="zz-bot-header-info">'
            +     '<div class="zz-bot-avatar">' + iconUser() + '</div>'
            +     '<div class="zz-bot-header-text">'
            +       '<span class="zz-bot-eyebrow">KI-Berater</span>'
            +       '<span class="zz-bot-title">' + escapeHtml(config.title) + '</span>'
            +     '</div>'
            +   '</div>'
            +   '<button class="zz-bot-close" aria-label="Schließen">&times;</button>'
            + '</div>'
            + '<div class="zz-bot-messages" id="zz-bot-messages"></div>'
            + '<div class="zz-bot-buttons" id="zz-bot-buttons"></div>'
            + '<div class="zz-bot-input">'
            +   '<input type="text" id="zz-bot-input" placeholder="Frage zu Profil, Stationen, Skills…" autocomplete="off">'
            +   '<button id="zz-bot-send" aria-label="Senden">' + iconSend() + '</button>'
            + '</div>'
            + '<div class="zz-bot-footer">Antwortet auf Basis von CV, Zeugnissen und eigenen Projekten</div>';
        document.body.appendChild(win);

        win.querySelector(".zz-bot-close").onclick = toggleChat;
        document.getElementById("zz-bot-send").onclick = send;
        document.getElementById("zz-bot-input").addEventListener("keydown", function (e) {
            if (e.key === "Enter") send();
        });
        rendered = true;
    }

    function open() {
        if (!rendered) renderWindow();
        if (isOpen) return;
        isOpen = true;
        var win = document.getElementById("zz-bot-window");
        var toggle = document.getElementById("zz-bot-toggle");
        win.classList.add("open");
        toggle.classList.add("active");
        toggle.innerHTML = iconClose() + '<span class="zz-bot-toggle__label">Schließen</span>';
        setTimeout(function () {
            var input = document.getElementById("zz-bot-input");
            if (input) input.focus();
        }, 350);
        if (!welcomed) {
            welcomed = true;
            apiCall({});
        }
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        var win = document.getElementById("zz-bot-window");
        var toggle = document.getElementById("zz-bot-toggle");
        win.classList.remove("open");
        toggle.classList.remove("active");
        toggle.innerHTML = iconBubble() + '<span class="zz-bot-toggle__label">KI-Berater</span>';
    }

    function toggleChat() {
        if (isOpen) close(); else open();
    }

    function addMessage(text, sender) {
        var messages = document.getElementById("zz-bot-messages");
        var msg = document.createElement("div");
        msg.className = "zz-msg " + sender;
        var formatted = String(text || "");

        // Markdown bold
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Externe https-Links abdichten
        formatted = formatted.replace(
            /(?<!["=>])(https?:\/\/[^\s\)<]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );

        // Zeilenumbrüche → <br> innerhalb eines Paragraphs (CSS macht den Rest mit pre-wrap)
        msg.innerHTML = formatted;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }

    function showButtons(buttons) {
        var container = document.getElementById("zz-bot-buttons");
        container.innerHTML = "";
        if (!buttons || !buttons.length) return;
        buttons.forEach(function (btn, i) {
            var el = document.createElement("button");
            el.textContent = btn.label;
            el.onclick = function () { sendButton(btn.action, btn.label); };
            el.style.animationDelay = (i * 0.04) + "s";
            el.style.animation = "zz-msg-in 0.22s ease-out backwards";
            container.appendChild(el);
        });
    }

    function showTyping() {
        var messages = document.getElementById("zz-bot-messages");
        var typing = document.createElement("div");
        typing.className = "zz-typing";
        typing.id = "zz-typing";
        typing.innerHTML = "<span></span><span></span><span></span>";
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;
    }

    function hideTyping() {
        var el = document.getElementById("zz-typing");
        if (el) el.remove();
    }

    function apiCall(payload) {
        showTyping();
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 30000);
        return fetch(config.backendUrl.replace(/\/$/, "") + "/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.assign({ session_id: sessionId }, payload)),
            signal: controller.signal,
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                clearTimeout(timeout);
                hideTyping();
                addMessage(data.reply, "bot");
                showButtons(data.buttons || []);
            })
            .catch(function (err) {
                hideTyping();
                if (err.name === "AbortError") {
                    addMessage("Die Antwort hat zu lange gedauert. Bitte erneut versuchen.", "bot");
                } else {
                    addMessage("Verbindung zum Bot fehlgeschlagen. Direkter Kontakt: zikos.zissis@outlook.com · +49 174 9247044", "bot");
                }
                showButtons([{ label: "Hauptmenü", action: "main_menu" }]);
            });
    }

    function send() {
        var input = document.getElementById("zz-bot-input");
        var text = (input.value || "").trim();
        if (!text) return;
        input.value = "";
        addMessage(text, "user");
        apiCall({ message: text });
    }

    function sendButton(action, label) {
        addMessage(label, "user");
        apiCall({ button_action: action });
    }

    function ask(question) {
        if (!rendered) renderWindow();
        open();
        var input = document.getElementById("zz-bot-input");
        if (input && question) {
            input.value = question;
            input.focus();
            // Cursor ans Ende
            var v = input.value; input.value = ""; input.value = v;
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* ===== Inline-SVG Icons ===== */
    function iconBubble() {
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="13" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="17" cy="10" r="0.9" fill="currentColor" stroke="none"/></svg>';
    }
    function iconClose() {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    }
    function iconUser() {
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
    function iconSend() {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    }

    window.ZikosBot = {
        init: init,
        toggle: toggleChat,
        open: open,
        close: close,
        send: send,
        ask: ask,
    };
})();
