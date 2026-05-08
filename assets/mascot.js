/**
 * Zikos · Mascot
 * 3D-Avatar der nach Page-Load reinläuft, begrüßt, dann in die Ecke wandert
 * und der Maus mit dem Kopf folgt. Klick öffnet den Karriere-Bot.
 */
(function () {
    'use strict';
    if (window.ZikosMascot) return;

    var stage, mascot, head, bubble;
    var mouseX = -9999, mouseY = -9999;
    var headX = 0, headY = 0;
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
        +     '<div class="mascot__body" aria-hidden="true"></div>'
        +     '<div class="mascot__head" aria-hidden="true"></div>'
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
        head = stage.querySelector('.mascot__head');
        bubble = stage.querySelector('.mascot__bubble');

        // Wire interactions
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

        // Track mouse globally for head-tracking
        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });

        // Hide mascot when ZikosBot window opens, restore when closed
        attachBotObserver();

        // Start the show after a beat
        setTimeout(walkInToStage, 900);

        // RAF loop
        requestAnimationFrame(track);
    }

    function attachBotObserver() {
        if (observer) return true;
        var win = document.getElementById('zz-bot-window');
        if (!win) return false;
        observer = new MutationObserver(function () {
            if (win.classList.contains('open')) {
                stage.classList.add('is-bot-open');
            } else {
                stage.classList.remove('is-bot-open');
            }
        });
        observer.observe(win, { attributes: true, attributeFilter: ['class'] });
        // Sync state
        if (win.classList.contains('open')) stage.classList.add('is-bot-open');
        return true;
    }

    function walkInToStage() {
        if (state !== 'idle-init') return;
        state = 'walking-in';
        mascot.classList.add('is-walking');
        // Trigger transition by updating data-pos
        // Force reflow before changing pos so transition runs
        void mascot.offsetWidth;
        mascot.setAttribute('data-pos', 'enter-stage');
        // After move ends, switch to greeting
        setTimeout(function () {
            mascot.classList.remove('is-walking');
            mascot.classList.add('is-greeting');
            state = 'greeting';
            // Auto-fall-back to corner if user ignores bubble
            setTimeout(function () {
                if (state === 'greeting') goToCorner();
            }, 14000);
        }, 1500);
    }

    function goToCorner() {
        if (state === 'corner-idle' || state === 'walking-corner') return;
        var was = state;
        state = 'walking-corner';
        mascot.classList.remove('is-greeting');
        // Walking starts after bubble fades
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
            // Window is now in DOM (lazy-rendered) — attach observer for close
            setTimeout(attachBotObserver, 30);
        };
        // If currently greeting / walking, transition to corner first
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

    function track() {
        if (mascot && (state === 'corner-idle' || state === 'greeting')) {
            var rect = mascot.getBoundingClientRect();
            var cx = rect.left + rect.width * 0.5;
            var cy = rect.top + rect.height * 0.21;

            var dx = mouseX - cx;
            var dy = mouseY - cy;
            var dist = Math.hypot(dx, dy);

            var max = 7;
            var tx = 0, ty = 0;
            if (dist > 1) {
                var attenuate = Math.min(1, dist / 280);
                tx = (dx / dist) * max * attenuate;
                ty = (dy / dist) * max * attenuate;
            }
            // Lerp toward target
            headX += (tx - headX) * 0.10;
            headY += (ty - headY) * 0.10;
            head.style.setProperty('--hx', headX.toFixed(2) + 'px');
            head.style.setProperty('--hy', headY.toFixed(2) + 'px');
        }
        requestAnimationFrame(track);
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
