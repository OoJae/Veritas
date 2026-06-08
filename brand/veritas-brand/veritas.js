/* ============================================================
   VERITAS — motion & onboarding
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- live clock ---------- */
  function tick() {
    var el = document.querySelector("[data-clock]");
    if (!el) return;
    var d = new Date();
    var hh = String(d.getUTCHours()).padStart(2, "0");
    var mm = String(d.getUTCMinutes()).padStart(2, "0");
    var ss = String(d.getUTCSeconds()).padStart(2, "0");
    el.textContent = hh + ":" + mm + ":" + ss + " UTC";
  }
  setInterval(tick, 1000); tick();

  /* ---------- onboarding intro ---------- */
  var intro = document.getElementById("intro");
  function finishIntro() {
    if (!intro || intro.classList.contains("done")) return;
    intro.classList.add("done");
    document.body.style.overflow = "";
    setTimeout(function () { if (intro) intro.remove(); }, 1500);
  }
  if (intro) {
    document.body.style.overflow = "hidden";
    var skip = intro.querySelector(".intro-skip");
    if (skip) skip.addEventListener("click", finishIntro);

    if (reduce) {
      finishIntro();
    } else {
      var statusEl = intro.querySelector(".intro-status");
      var barEl = intro.querySelector(".intro-bar i");
      var pctEl = intro.querySelector(".intro-pct");
      var nodes = Array.prototype.slice.call(intro.querySelectorAll(".intro-nodes span"));
      var steps = [
        "Initializing primitive",
        "Convening validator subcommittee",
        "Establishing <b>deterministic consensus</b>",
        "Sealing verdict receipt",
        "<b>Consensus reached</b>"
      ];
      var p = 0, si = 0;
      var iv = setInterval(function () {
        p = Math.min(100, p + Math.random() * 9 + 4);
        if (barEl) barEl.style.right = (100 - p) + "%";
        if (pctEl) pctEl.textContent = String(Math.floor(p)).padStart(3, "0") + " / 100";
        var stage = Math.min(steps.length - 1, Math.floor((p / 100) * steps.length));
        if (stage !== si) { si = stage; if (statusEl) statusEl.innerHTML = steps[si]; }
        var lit = Math.round((p / 100) * nodes.length);
        nodes.forEach(function (n, i) { n.classList.toggle("on", i < lit); });
        if (p >= 100) {
          clearInterval(iv);
          if (statusEl) statusEl.innerHTML = steps[steps.length - 1];
          setTimeout(finishIntro, 700);
        }
      }, 240);
    }
  }

  /* ---------- reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- scroll-linked motion ---------- */
  var bust = document.querySelector(".hero-bust");
  var word = document.querySelector(".hero-wordmark");
  var loopVisuals = Array.prototype.slice.call(document.querySelectorAll("[data-rot]"));
  var prailDots = Array.prototype.slice.call(document.querySelectorAll(".prail i"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-sec]"));
  var ticking = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    /* hero parallax */
    if (bust && !reduce) {
      var hp = clamp(y / vh, 0, 1.4);
      bust.style.transform = "translateX(-50%) translateY(" + (hp * 120) + "px) scale(" + (1 + hp * 0.06) + ")";
    }
    if (word && !reduce) {
      var wp = clamp(y / vh, 0, 1);
      word.style.transform = "translateY(" + (-wp * 90) + "px)";
      word.style.letterSpacing = (-0.025 + wp * 0.06) + "em";
      word.style.opacity = String(1 - wp * 0.55);
    }

    /* 3D rotation tied to each element's position in viewport */
    if (!reduce) {
      loopVisuals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var prog = clamp((vh - r.top) / (vh + r.height), 0, 1); // 0..1 as it crosses
        var rotY = (prog - 0.5) * 46;   // -23..23 deg
        var rotX = (0.5 - prog) * 16;
        el.style.setProperty("--ry", rotY.toFixed(2) + "deg");
        el.style.setProperty("--rx", rotX.toFixed(2) + "deg");
        el.style.setProperty("--prog", prog.toFixed(3));
      });
    }

    /* progress rail */
    if (prailDots.length && sections.length) {
      var active = 0, best = 1e9;
      sections.forEach(function (s, i) {
        var rr = s.getBoundingClientRect();
        var d = Math.abs(rr.top - vh * 0.35);
        if (d < best) { best = d; active = i; }
      });
      prailDots.forEach(function (d, i) { d.classList.toggle("on", i === active); });
    }

    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- enter app ---------- */
  document.querySelectorAll("[data-enter]").forEach(function (el) {
    el.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ---------- magnetic cursor on big interactive words ---------- */
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) / r.width;
        var my = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = "translate(" + (mx * 14) + "px," + (my * 14) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }
})();
