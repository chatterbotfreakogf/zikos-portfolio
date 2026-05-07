/**
 * Zikos · Karriere-Chatbot — Auto-Loader.
 *
 * Erkennt selbst die Backend-URL anhand des eigenen <script>-Tags und
 * initialisiert das Widget. Praktisch für Render-/CDN-Deploys, bei denen
 * die Domain nicht hartkodiert sein soll.
 */
(function () {
    'use strict';
    var me = document.currentScript || (function () {
        var s = document.getElementsByTagName('script');
        return s[s.length - 1];
    })();
    var src = me && me.src ? me.src : '';
    var backendUrl = src.replace(/\/widget\/chatbot-loader\.js.*$/, '');
    if (!backendUrl) return;

    function loadScript(url, onload) {
        var s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = onload;
        document.head.appendChild(s);
    }

    function start() {
        if (window.ZikosBot) {
            window.ZikosBot.init({
                backendUrl: backendUrl,
                title: "Karriere-Bot · Zikos"
            });
        }
    }

    var v = '1';
    if (window.ZikosBot) {
        start();
    } else {
        loadScript(backendUrl + '/widget/chatbot-widget.js?v=' + v, start);
    }
})();
