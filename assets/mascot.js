/**
 * Zikos · Mascot
 * Statisches Bild mit Walk-In, Sprechblase und Click-to-Open-Bot.
 * State-Machine: idle-init → walking-in → greeting → walking-corner → corner-idle
 */
(function () {
    'use strict';
    if (window.ZikosMascot) return;

    var stage, mascot;
    var state = 'idle-init';
    var observer = null;

    var BUBBLE_HTML = ''
        + '<div class="mascot__bubble" role="dialog" aria-live="polite" aria-label="Begrüßung">'
        +   '<button class="mascot__bubble-close" type="button" aria-label="Sprechblase schließen">×</button>'
        +   '<span class="mascot__bubble-eyebrow">KI-Berater · Live</span>'
        +   '<h3 class="mascot__bubble-title">Hallo! Schön, dass du da bist.</h3>'
        +   '<p class="mascot__bubble-text">Chatte mit mir &mdash; ich bin Zikos&apos; <strong>KI-Abbild</strong> und antworte auf alles zu seinem Profil.</p>'
        +   '<button class="mascot__bubble-cta" type="button">Chat starten'
        +     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>'
        +   '</button>'
        + '</div>';

    var STAGE_HTML = ''
        + '<div class="mascot" data-pos="off-stage" tabindex="0" role="button" aria-label="KI-Berater öffnen">'
        +   '<div class="mascot__inner">'
        +     '<div class="mascot__figure" aria-hidden="true"></div>'
        +   '</div>'
        +   BUBBLE_HTML
        +   '<span class="mascot__hint" aria-hidden="true">Klick mich</span>'
        + '</div>';

    function build() {
        if (document.querySelector('.mascot-stage')) return;

        stage = document.createElement('div');
        stage.className = 'mascot-stage';
        stage.innerHTML = STAGE_HTML;
        document.body.appendChild(stage);
        document.body.classList.add('has-mascot');

        mascot = stage.querySelector('.mascot');

        stage.querySelector('.mascot__bubble-close').addEventListener('click', function (e) {
            e.stopPropagation();
            goToCorner();
        });
        stage.querySelector('.mascot__bubble-cta').addEventListener('click', function (e) {
            e.stopPropagation();
            openBot();
        });
        mascot.addEventListener('click', function (e) {
            if (e.target.closest('.mascot__bubble')) return;
            if (state === 'corner-idle' || state === 'greeting') openBot();
        });
        mascot.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (state === 'corner-idle' || state === 'greeting') openBot();
            }
        });

        attachBotObserver();
        setTimeout(walkInToStage, 900);
    }

    function attachBotObserver() {
        if (observer) return true;
        var win = document.getElementById('zz-bot-window');
        if (!win) return false;
        observer = new MutationObserver(function () {
            if (win.classList.contains('open')) stage.classList.add('is-bot-open');
            else stage.classList.remove('is-bot-open');
        });
        observer.observe(win, { attributes: true, attributeFilter: ['class'] });
        if (win.classList.contains('open')) stage.classList.add('is-bot-open');
        return true;
    }

    function walkInToStage() {
        if (state !== 'idle-init') return;
        state = 'walking-in';
        mascot.classList.add('is-walking');
        void mascot.offsetWidth;
        mascot.setAttribute('data-pos', 'enter-stage');
        setTimeout(function () {
            mascot.classList.remove('is-walking');
            mascot.classList.add('is-greeting');
            state = 'greeting';
            setTimeout(function () {
                if (state === 'greeting') goToCorner();
            }, 14000);
        }, 1500);
    }

    function goToCorner() {
        if (state === 'corner-idle' || state === 'walking-corner') return;
        state = 'walking-corner';
        mascot.classList.remove('is-greeting');
        setTimeout(function () {
            mascot.classList.add('is-walking');
            mascot.setAttribute('data-pos', 'corner');
        }, 220);
        setTimeout(function () {
            mascot.classList.remove('is-walking');
            mascot.classList.add('is-idle');
            state = 'corner-idle';
        }, 1900);
    }

    function openBot() {
        if (!window.ZikosBot || typeof window.ZikosBot.open !== 'function') return;
        var doOpen = function () {
            window.ZikosBot.open();
            stage.classList.add('is-bot-open');
            setTimeout(attachBotObserver, 30);
        };
        if (state === 'greeting' || state === 'walking-in') {
            mascot.classList.remove('is-greeting');
            mascot.classList.add('is-walking');
            mascot.setAttribute('data-pos', 'corner');
            state = 'walking-corner';
            setTimeout(function () {
                mascot.classList.remove('is-walking');
                mascot.classList.add('is-idle');
                state = 'corner-idle';
                doOpen();
            }, 1400);
        } else {
            doOpen();
        }
    }

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    window.ZikosMascot = {
        init: build,
        toCorner: goToCorner,
        openBot: openBot
    };

    ready(build);
})();
