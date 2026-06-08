/* ============================================================
   VERITAS — in-app prototype interactions
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---- screen routing ---- */
  function show(screen) {
    $all(".screen").forEach(function (s) { s.classList.remove("active"); });
    var el = document.getElementById("screen-" + screen);
    if (el) el.classList.add("active");
    $all(".app-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === screen);
    });
    window.scrollTo(0, 0);
  }
  $all("[data-nav]").forEach(function (el) {
    el.addEventListener("click", function () { show(el.getAttribute("data-nav")); });
  });
  $all("[data-open-market]").forEach(function (el) {
    el.addEventListener("click", function () { show("market"); });
  });

  /* ---- staking (open market) ---- */
  var yesPool = 5.38, noPool = 3.02, myYes = 0, myNo = 0;
  function fmt(n) { return n.toFixed(2) + " STT"; }
  function renderPools() {
    var total = yesPool + noPool;
    var yp = Math.round((yesPool / total) * 100);
    var np = 100 - yp;
    $("#md-yl").textContent = "YES " + yp + "%";
    $("#md-nl").textContent = "NO " + np + "%";
    $("#md-yb").style.width = yp + "%";
    $("#md-nb").style.width = np + "%";
    $("#md-yp").textContent = fmt(yesPool);
    $("#md-np").textContent = fmt(noPool);
    $("#my-yes").textContent = fmt(myYes);
    $("#my-no").textContent = fmt(myNo);
    var win = myYes; // assume YES outcome for the demo return
    $("#my-ret").textContent = win > 0 ? "≈ " + ((win / yesPool) * (yesPool + noPool)).toFixed(2) + " STT" : "—";
  }
  $all("[data-stake]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var amt = parseFloat($("#stake-input").value) || 0;
      if (amt <= 0) return;
      if (btn.getAttribute("data-stake") === "yes") { yesPool += amt; myYes += amt; }
      else { noPool += amt; myNo += amt; }
      renderPools();
      btn.style.transform = "scale(0.96)";
      setTimeout(function () { btn.style.transform = ""; }, 140);
    });
  });
  renderPools();

  /* ---- verdict resolution animation ---- */
  var stageOrder = ["ask", "gather", "reason", "verdict"];
  var stageTimes = { ask: "0.0s", gather: "1.4s", reason: "2.6s", verdict: "3.1s" };
  function setStage(name, state) {
    var tk = $('.tk[data-stage="' + name + '"]');
    if (!tk) return;
    tk.classList.remove("pending", "active", "done");
    tk.classList.add(state);
    var node = $(".node", tk);
    var time = $(".tk-time", tk);
    if (state === "active") { node.innerHTML = '<span class="spin"></span>'; }
    else if (state === "done") {
      node.innerHTML = "✓";
      if (time) time.textContent = stageTimes[name] || "";
    } else { node.textContent = "0" + (stageOrder.indexOf(name) + 1); }
  }

  function runResolution() {
    $("#md-trigger").style.display = "none";
    $("#md-status").innerHTML = '<span class="spin" style="width:10px;height:10px;border:2px solid color-mix(in oklch,var(--verum) 30%,transparent);border-top-color:var(--verum);border-radius:50%;display:inline-block;animation:spin .8s linear infinite"></span> Resolving';
    $("#md-status").className = "st st--active";

    var seq = [
      [0,    function () { setStage("ask", "done"); }],
      [300,  function () { setStage("gather", "active"); }],
      [1700, function () { setStage("gather", "done"); setStage("reason", "active"); }],
      [3100, function () { setStage("reason", "done"); setStage("verdict", "active"); }],
      [3900, function () { setStage("verdict", "done"); finish(); }]
    ];
    var t0 = reduce ? null : 1;
    if (reduce) {
      // jump straight to resolved
      stageOrder.forEach(function (s) { setStage(s, "done"); });
      finish();
      return;
    }
    seq.forEach(function (step) { setTimeout(step[1], step[0]); });
  }

  function finish() {
    var status = $("#md-status");
    status.className = "st st--true";
    status.textContent = "Resolved · TRUE";

    var res = $("#md-result");
    res.style.display = "block";
    res.style.marginTop = "20px";
    res.innerHTML =
      '<div class="result true">' +
        '<div class="big">TRUE</div>' +
        '<div class="meta">CONFIDENCE <b>0.96</b><br/>CONSENSUS <b>MAJORITY · 3 / 3</b><br/>RECEIPT <b>0x7af3…e10c</b></div>' +
      '</div>';

    $("#md-trace").style.display = "block";
    // betting is over -> swap stake panel for claim
    $("#md-stake").style.display = "none";
    $("#md-claim").style.display = "block";
  }

  var trigger = $("#trigger-btn");
  if (trigger) trigger.addEventListener("click", runResolution);

  var claim = $("#claim-btn");
  if (claim) claim.addEventListener("click", function () {
    claim.textContent = "Claimed ✓";
    claim.disabled = true;
  });
})();
