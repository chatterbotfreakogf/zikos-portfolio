/* ============================================================
   scene.js — ambient canvas background
   - drifting particle field with proximity links
   - cursor-reactive light source
   - DPR-aware, paused when tab hidden, respects reduced-motion
   - zero dependencies, ~3 KB minified
   ============================================================ */

(() => {
  "use strict";

  const canvas = document.getElementById("scene");
  if (!canvas) return;

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /** state */
  let w = 0, h = 0;
  let particles = [];
  let mouse = { x: -9999, y: -9999, has: false };
  let target = { x: -9999, y: -9999 };
  let raf = 0;
  let running = true;

  /** config */
  const CFG = {
    density: 0.000055,   // particles per px²; tuned for calm feel
    minCount: 60,
    maxCount: 180,
    speed: 0.18,         // base drift speed
    linkDist: 130,       // px — distance under which two particles get a faint line
    cursorRadius: 220,   // halo influence radius
    cursorEase: 0.08,    // how quickly the halo follows the cursor
  };

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    const count = clamp(Math.round(w * h * CFG.density), CFG.minCount, CFG.maxCount);
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * CFG.speed,
      vy: (Math.random() - 0.5) * CFG.speed,
      r: 0.6 + Math.random() * 1.2,
      a: 0.18 + Math.random() * 0.5,
    }));
  }

  function clamp(v, mn, mx) { return v < mn ? mn : v > mx ? mx : v; }

  function step() {
    if (!running) return;

    // ease cursor
    target.x += (mouse.x - target.x) * CFG.cursorEase;
    target.y += (mouse.y - target.y) * CFG.cursorEase;

    ctx.clearRect(0, 0, w, h);

    // soft cursor halo
    if (mouse.has) {
      const grad = ctx.createRadialGradient(
        target.x, target.y, 0,
        target.x, target.y, CFG.cursorRadius
      );
      grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
      grad.addColorStop(0.6, "rgba(255, 255, 255, 0.04)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;

      // cursor nudge
      if (mouse.has) {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const d2 = dx * dx + dy * dy;
        const r2 = CFG.cursorRadius * CFG.cursorRadius;
        if (d2 < r2) {
          const f = (1 - d2 / r2) * 0.04;
          p.vx += (dx / Math.sqrt(d2 + 1)) * f;
          p.vy += (dy / Math.sqrt(d2 + 1)) * f;
          // subtle damping so they don't accelerate forever
          p.vx *= 0.985;
          p.vy *= 0.985;
        }
      }

      // draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`;
      ctx.fill();
    }

    // connections (proximity lines, classic but understated)
    const linkD = CFG.linkDist;
    const linkD2 = linkD * linkD;
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkD2) {
          const o = (1 - d2 / linkD2) * 0.18;
          ctx.strokeStyle = `rgba(255, 255, 255, ${o})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(step);
  }

  /** events */
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.has = true;
    if (!raf) raf = requestAnimationFrame(step);
  }
  function onLeave() {
    mouse.has = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }
  function onVisibility() {
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(step);
    else if (!running) { cancelAnimationFrame(raf); raf = 0; }
  }

  /** init */
  resize();
  step();

  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    resize();
    step();
  }, { passive: true });

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
})();
