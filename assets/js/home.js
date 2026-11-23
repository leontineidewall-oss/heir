// home.js: the switch monitor, the steps, the calculator, the live coins
(function(){
"use strict";
var H = window.HEIR, $ = H.$, $$ = H.$$, GOLD = "#e8c15a", IV = "#f3ede0";
function fit(cv){ var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); return { c: c, w: r.width, h: r.height }; }
function rgba(h, a){ var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
// one heartbeat, phase 0..1: a small p wave, the spike, the t wave
function ecg(p){ if (p < .1) return Math.sin(p / .1 * Math.PI) * .12; if (p < .16) return 0; if (p < .19) return -(p - .16) / .03 * .18; if (p < .23) return -.18 + (p - .19) / .04 * 1.18; if (p < .28) return 1 - (p - .23) / .05 * 1.42; if (p < .31) return -.42 + (p - .28) / .03 * .42; if (p < .42) return 0; if (p < .58) return Math.sin((p - .42) / .16 * Math.PI) * .22; return 0; }
/* ---------- the switch: drag the hours, watch the pulse fade and the fees fan out ---------- */
var mon = $("#mon"), hrs = $("#hrs"), M = { h: 0, auto: true, hold: 0, fired: 0, t0: performance.now() }, FAN = [];
(function(){ var rings = [[.18, 5], [.25, 8], [.32, 10], [.39, 12], [.46, 15]]; rings.forEach(function(r, ri){ for (var i = 0; i < r[1]; i++) { var a = -1.05 + 2.1 * (i + .5) / r[1]; FAN.push({ r: r[0], a: a, ri: ri, ph: Math.random() }); } }); })();
function setH(h, user){ M.h = Math.max(0, Math.min(96, h)); if (user) { M.auto = false; M.hold = performance.now() + 9000; } hrs.value = M.h; hrs.style.setProperty("--p", (M.h / 96 * 100) + "%"); hrs.classList.toggle("gold", M.h >= 72); $("#hrsv").textContent = Math.floor(M.h) + "h";
  var fired = M.h >= 72; if (fired && !M.fired) M.fired = performance.now(); if (!fired) M.fired = 0;
  $("#m-last").textContent = M.h < 1 ? "just now" : Math.floor(M.h) + "h ago"; $("#m-in").textContent = fired ? "00:00:00" : H.left((72 - M.h) * 3600e3);
  $("#m-pays").textContent = fired ? "top 50 holders" : "the dev"; $("#m-pays").className = "v" + (fired ? " g" : ""); $("#m-state").textContent = fired ? "fired" : "alive"; $("#m-state").className = "v" + (fired ? " g" : ""); }
function drawMon(now){
  if (!mon) return; var F = mon._f || (mon._f = fit(mon)), c = F.c, w = F.w, h = F.h, t = (now - M.t0) / 1000, fired = M.h >= 72;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = "rgba(243,237,224,.04)"; c.lineWidth = 1; for (var x = 0; x < w; x += 20) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); } for (var y = 0; y < h; y += 20) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
  var base = h * .56, tr = w * .5, amp = fired ? 0 : (1 - .78 * M.h / 72) * h * .28, per = 1.15, sx = w * .6, sy = base, sr = Math.min(w, h) * .085;
  // the trace: newest on the right, sweeping
  var g = c.createLinearGradient(0, 0, tr, 0); g.addColorStop(0, rgba(IV, 0)); g.addColorStop(.25, rgba(IV, .85)); g.addColorStop(1, fired ? GOLD : IV);
  var firedAgo = fired && M.fired ? (now - M.fired) / 1000 : 0, weak = h * .06;
  c.beginPath(); for (var px = 0; px <= tr; px += 1.5) { var tt = t - (tr - px) / (w * .22), p = ((tt / per) % 1 + 1) % 1, yy = base - (fired ? (tt > t - firedAgo ? 0 : weak) : amp) * ecg(p); if (px === 0) c.moveTo(px, yy); else c.lineTo(px, yy); }
  c.strokeStyle = g; c.lineWidth = 2.4; c.lineJoin = "round"; c.shadowColor = fired ? GOLD : IV; c.shadowBlur = 8; c.stroke(); c.shadowBlur = 0;
  c.strokeStyle = fired ? GOLD : rgba(IV, .35); c.setLineDash([2, 7]); c.beginPath(); c.moveTo(tr, base); c.lineTo(sx - sr - 4, base); c.stroke(); c.setLineDash([]);
  // the head of the trace
  c.fillStyle = fired ? GOLD : IV; c.beginPath(); c.arc(tr, base - (fired ? 0 : amp * ecg(((t / per) % 1))), 3.5, 0, 7); c.fill();
  // labels
  c.font = "700 11px MO, monospace"; c.fillStyle = fired ? GOLD : "#7d776a"; c.textAlign = "left"; c.fillText(fired ? "SWITCH FIRED" : "SWITCH IN " + H.left((72 - M.h) * 3600e3), 18, 28);
  c.fillStyle = "#57534a"; c.fillText("DEV PULSE", 18, h - 18); c.textAlign = "right"; c.fillText(fired ? "TOP 50 HOLDERS" : "HEIRS · WAITING", w - 18, h - 18);
  // the heirs: dim until it fires, then threads fan out with sparks running down them
  var k = fired && M.fired ? Math.min(1, (now - M.fired) / 1100) : 0, R = Math.min(w * .42, h * 1.1);
  FAN.forEach(function(d){ var dx = sx + Math.cos(d.a) * R * d.r * 2.05, dy = sy + Math.sin(d.a) * R * d.r * 1.25; dx = Math.min(w - 16, dx);
    if (k > 0) { var e = Math.min(1, k * 1.6 - d.ri * .12); if (e > 0) { c.strokeStyle = rgba(GOLD, .32 * e); c.lineWidth = 1; c.beginPath(); c.moveTo(sx + sr * .8, sy); c.bezierCurveTo(sx + sr + 30, sy, dx - 50, dy, sx + sr * .8 + (dx - sx - sr * .8) * e, sy + (dy - sy) * e); c.stroke();
      var u = (t * .45 + d.ph) % 1, bx = Math.pow(1 - u, 3) * (sx + sr * .8) + 3 * Math.pow(1 - u, 2) * u * (sx + sr + 30) + 3 * (1 - u) * u * u * (dx - 50) + u * u * u * dx, by = Math.pow(1 - u, 3) * sy + 3 * Math.pow(1 - u, 2) * u * sy + 3 * (1 - u) * u * u * dy + u * u * u * dy;
      if (e >= 1) { c.fillStyle = rgba("#fff3c4", .9); c.beginPath(); c.arc(bx, by, 1.4, 0, 7); c.fill(); } } }
    var lit = k > 0 && k * 1.6 - d.ri * .12 >= 1; c.fillStyle = lit ? GOLD : "#2b2822"; c.beginPath(); c.arc(dx, dy, lit ? 4.2 : 3.4, 0, 7); c.fill();
    if (lit) { c.fillStyle = rgba(GOLD, .12); c.beginPath(); c.arc(dx, dy, 9, 0, 7); c.fill(); } });
  // the seal
  var glow = c.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2); glow.addColorStop(0, rgba(GOLD, fired ? .35 : .12)); glow.addColorStop(1, rgba(GOLD, 0)); c.fillStyle = glow; c.beginPath(); c.arc(sx, sy, sr * 3.2, 0, 7); c.fill();
  var sg = c.createRadialGradient(sx - sr * .35, sy - sr * .4, 1, sx, sy, sr * 1.1); sg.addColorStop(0, "#fbe39a"); sg.addColorStop(.55, GOLD); sg.addColorStop(1, "#8f6a1a");
  c.fillStyle = sg; c.beginPath(); for (var i = 0; i <= 64; i++) { var an = i / 64 * Math.PI * 2, rr = sr * (1 + .035 * Math.sin(an * 7 + 1) + .02 * Math.sin(an * 11)); c.lineTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr); } c.fill();
  c.strokeStyle = "rgba(125,90,18,.6)"; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, sr * .78, 0, 7); c.stroke();
  c.strokeStyle = "#3f2d06"; c.lineWidth = Math.max(2, sr * .09); c.lineJoin = "round"; c.lineCap = "round"; c.beginPath(); var q = sr / 60;
  c.moveTo(sx - 44 * q, sy + 4 * q); c.lineTo(sx - 20 * q, sy + 4 * q); c.lineTo(sx - 16 * q, sy + 10 * q); c.lineTo(sx - 10 * q, sy - 36 * q); c.lineTo(sx - 3 * q, sy + 30 * q); c.lineTo(sx + 2 * q, sy + 4 * q); c.lineTo(sx + 44 * q, sy + 4 * q); c.stroke();
}
if (mon) {
  hrs.addEventListener("input", function(){ setH(+hrs.value, true); });
  var drag = false; mon.addEventListener("pointerdown", function(e){ drag = true; mon.setPointerCapture(e.pointerId); move(e); }); mon.addEventListener("pointermove", function(e){ if (drag) move(e); }); mon.addEventListener("pointerup", function(){ drag = false; });
  function move(e){ var r = mon.getBoundingClientRect(); setH((e.clientX - r.left) / r.width * 96, true); }
  window.addEventListener("resize", function(){ mon._f = null; hc._f = null; });
  setH(0);
}
/* ---------- how: a rail of four steps, the active one acts itself out ---------- */
var hc = $("#howcv") || {}, HS = { s: 0, t0: performance.now() };
function drawHow(now){
  if (!hc.getContext) return; var F = hc._f || (hc._f = fit(hc)), c = F.c, w = F.w, h = F.h, t = (now - HS.t0) / 1000, s = HS.s;
  c.clearRect(0, 0, w, h); var rx = 34, top = 36, gap = (h - 72) / 3;
  c.strokeStyle = "#2b2822"; c.lineWidth = 2; c.beginPath(); c.moveTo(rx, top); c.lineTo(rx, top + gap * 3); c.stroke();
  c.strokeStyle = GOLD; c.beginPath(); c.moveTo(rx, top); c.lineTo(rx, top + gap * s * Math.min(1, t * 2) + (s ? 0 : 0)); c.stroke();
  ["add", "route", "check in", "miss one"].forEach(function(l, i){ var y = top + gap * i, on = i <= s; c.fillStyle = on ? GOLD : "#1c1914"; c.strokeStyle = on ? GOLD : "#3a372f"; c.lineWidth = 2; c.beginPath(); c.arc(rx, y, i === s ? 9 : 6, 0, 7); c.fill(); c.stroke();
    if (i === s) { c.fillStyle = rgba(GOLD, .18 + .1 * Math.sin(t * 4)); c.beginPath(); c.arc(rx, y, 18, 0, 7); c.fill(); }
    c.font = "700 11px MO, monospace"; c.fillStyle = i === s ? IV : "#57534a"; c.textAlign = "left"; c.fillText("0" + (i + 1) + "  " + l.toUpperCase(), rx + 22, y + 4); });
  var ax = Math.max(170, w * .38), aw = w - ax - 24, cy = h / 2;
  c.textAlign = "center"; c.font = "700 12px MO, monospace";
  if (s === 0) { // a note gets signed, the curve confirms the creator
    box(c, ax, cy - 74, aw, 56, "#15130f", "#3a372f"); c.fillStyle = GOLD; c.fillText("heir:1:register:<mint>", ax + aw / 2, cy - 42);
    var k = Math.min(1, t / 1.2); c.fillStyle = "#7d776a"; c.fillText("signed by", ax + aw / 2, cy + 2); c.fillStyle = IV; c.fillText("your wallet", ax + aw / 2, cy + 22);
    c.fillStyle = k >= 1 ? GOLD : "#3a372f"; c.fillText(k >= 1 ? "✓ creator on the bonding curve" : "checking the curve…", ax + aw / 2, cy + 64);
  } else if (s === 1) { // trades pay fees into the vault, the vault pays the dev
    var nodes = [["trades", cy - 80], ["creator fees", cy - 26], ["heir vault", cy + 28], ["you, the dev", cy + 82]];
    nodes.forEach(function(n, i){ box(c, ax + aw * .15, n[1] - 18, aw * .7, 36, i === 2 ? "rgba(232,193,90,.12)" : "#15130f", i === 2 ? GOLD : "#3a372f"); c.fillStyle = i === 2 ? GOLD : IV; c.fillText(n[0], ax + aw / 2, n[1] + 4); });
    for (var j = 0; j < 3; j++) { var u = (t * .8 + j / 3) % 1, y0 = cy - 62 + u * 162; c.fillStyle = GOLD; c.beginPath(); c.arc(ax + aw / 2, y0, 3, 0, 7); c.fill(); }
  } else if (s === 2) { // a pulse, and the clock going back to 72h
    var base = cy + 10, per = 1.6, tt = (t % per) / per; c.strokeStyle = IV; c.lineWidth = 2; c.beginPath(); for (var x = 0; x <= aw; x += 2) { var p = ((t - (aw - x) / 110) / per % 1 + 1) % 1, y = base - 46 * ecg(p); x ? c.lineTo(ax + x, y) : c.moveTo(ax + x, y); } c.stroke();
    var left = 72 * 3600e3 * (1 - (tt < .25 ? 0 : (tt - .25) * .02)); c.fillStyle = tt < .3 ? GOLD : "#7d776a"; c.font = "700 22px MO, monospace"; c.fillText(H.left(left), ax + aw / 2, cy - 58); c.font = "700 11px MO, monospace"; c.fillStyle = "#57534a"; c.fillText(tt < .3 ? "CHECKED IN · RESET" : "SWITCH IN", ax + aw / 2, cy - 84);
  } else { // flatline, then the fan
    var bx = ax + aw * .3; c.strokeStyle = GOLD; c.setLineDash([2, 7]); c.lineWidth = 2; c.beginPath(); c.moveTo(ax, cy); c.lineTo(bx, cy); c.stroke(); c.setLineDash([]);
    var k2 = Math.min(1, t / 1.4); c.fillStyle = GOLD; c.beginPath(); c.arc(bx, cy, 7, 0, 7); c.fill();
    for (var i2 = 0; i2 < 50; i2++) { var col = i2 % 5, row = Math.floor(i2 / 5), dx = ax + aw * .55 + col * (aw * .1), dy = cy - 112 + row * 25;
      c.strokeStyle = rgba(GOLD, .25 * k2); c.lineWidth = 1; c.beginPath(); c.moveTo(bx, cy); c.bezierCurveTo(bx + 40, cy, dx - 40, dy, bx + (dx - bx) * k2, cy + (dy - cy) * k2); c.stroke();
      c.fillStyle = k2 >= 1 ? GOLD : "#2b2822"; c.beginPath(); c.arc(dx, dy, 3.4, 0, 7); c.fill(); }
    c.fillStyle = "#7d776a"; c.fillText("72:00:00 · no check-in", ax + aw * .15, cy - 18);
  }
}
function box(c, x, y, w, h, fill, stroke){ c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 1; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, 10); else c.rect(x, y, w, h); c.fill(); c.stroke(); }
if ("IntersectionObserver" in window) { var sio = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { var s = +e.target.dataset.s; if (s !== HS.s) { HS.s = s; HS.t0 = performance.now(); } $$(".steps .st").forEach(function(x){ x.classList.toggle("on", +x.dataset.s === s); }); var hc2 = $("#howc"); if (hc2) hc2.textContent = "0" + (s + 1) + " / 04"; } }); }, { rootMargin: "-45% 0px -45% 0px" }); $$(".steps .st").forEach(function(e){ sio.observe(e); }); }
/* ---------- one loop for both canvases, paused off screen ---------- */
var vis = { mon: true, how: false };
if ("IntersectionObserver" in window) { new IntersectionObserver(function(es){ es.forEach(function(e){ vis[e.target.id === "mon" ? "mon" : "how"] = e.isIntersecting; }); }).observe(mon); if (hc.getContext) new IntersectionObserver(function(es){ vis.how = es[0].isIntersecting; }).observe(hc); }
function loop(now){ requestAnimationFrame(loop); if (document.hidden) return;
  if (M.auto || now > M.hold) { if (!M.auto) { M.auto = true; } var cyc = ((now / 1000) % 14) / 14; setH(cyc < .78 ? cyc / .78 * 90 : 90); }
  if (vis.mon) drawMon(now); if (vis.how) drawHow(now); }
if (H.RM) { setH(80); drawMon(performance.now()); } else requestAnimationFrame(loop);
/* ---------- your cut ---------- */
function calc(){ var vv = Math.pow(10, -1 + 3 * $("#c-v").value / 1000), b = $("#c-b").value / 100, tp = +$("#c-t").value; b = Math.min(b, tp);
  ["#c-v", "#c-b", "#c-t"].forEach(function(s){ var e = $(s); e.style.setProperty("--p", ((e.value - e.min) / (e.max - e.min) * 100) + "%"); });
  var pay = Math.max(0, vv - .001), share = b / tp, cut = pay * share;
  $("#c-vv").textContent = H.sol(vv, vv >= 10 ? 1 : 2); $("#c-bv").textContent = b.toFixed(2) + "%"; $("#c-tv").textContent = tp + "%";
  $("#c-out").innerHTML = cut.toFixed(4) + "<small>SOL</small>"; $("#c-p1").textContent = (share * 100).toFixed(2) + "%"; $("#c-p2").textContent = b.toFixed(2) + "%";
  $("#c-b1").style.width = Math.min(100, share * 100) + "%"; $("#c-b2").style.width = Math.min(100, b) + "%";
  $("#c-note").innerHTML = cut < .001 ? "under <b>◎0.001</b>, so this cut drops this round and its share goes to the rest." : "payable = vault − ◎0.001 kept for rent. your cut = payable × <b>your bag ÷ what the top 50 hold</b>."; }
["#c-v", "#c-b", "#c-t"].forEach(function(s){ var e = $(s); if (e) e.addEventListener("input", calc); }); if ($("#c-v")) calc();
/* ---------- tape ---------- */
var tape = $("#tape"); if (tape) { var one = ["check in every <b>72h</b>", "one signature", "miss one, the switch fires", "fees pass to the <b>top 50</b>", "split by bag", "forever", "no token needed", "the chain is the database", "type <b>/</b> for the terminal"].map(function(x){ return "<span>" + x + "</span><span>·</span>"; }).join(""); tape.innerHTML = one + one; }
/* ---------- terminal on the page ---------- */
var ht = $("#hometerm"); if (ht) { ht.innerHTML = H.termWin(); H.term(ht); }
/* ---------- live coins ---------- */
var COINS = [];
function paintCoins(){ var el = $("#coinlist"); if (!el) return;
  if (!COINS.length) { el.innerHTML = "<div class=\"card\" style=\"grid-column:1/-1\"><div class=\"empty\" style=\"padding:10px\">" + (H.cfg && H.cfg.live === false ? "heir opens as soon as its vault secret is set. the first coin shows up here the minute its dev signs." : "no coins on heir yet. the first one shows up here the minute its dev signs.") + "</div></div>"; return; }
  el.innerHTML = COINS.slice(0, 9).map(function(c){ var f = c.state === "fired"; return "<a class=\"coin\" href=\"/app#coin/" + c.mint + "\">" + H.ava(c) + "<div><b>" + H.esc(H.name(c)) + "</b><small>" + (f ? "vault " + H.sol(c.bal) : "dev " + H.short(c.dev)) + "</small></div><span class=\"tag" + (f ? " fired" : "") + "\"><i class=\"dot" + (f ? " g" : "") + "\"></i><span data-dl=\"" + (f ? "" : c.deadline) + "\">" + (f ? "fired" : H.left(c.deadline - Date.now())) + "</span></span></a>"; }).join(""); }
function loadCoins(){ H.api("coins").then(function(j){ if (j.error) { $("#coinlist").innerHTML = "<div class=\"card\" style=\"grid-column:1/-1\"><div class=\"empty\" style=\"padding:10px\">the registry is unreachable right now. it comes back on its own.</div></div>"; return; }
  COINS = (j.coins || []).sort(function(a, b){ return (a.state === b.state ? 0 : a.state === "fired" ? -1 : 1) || b.registered - a.registered; });
  $("#s-coins").textContent = j.live ? j.counts.coins : "—"; $("#s-alive").textContent = j.live ? j.counts.alive : "—"; $("#s-fired").textContent = j.live ? j.counts.fired : "—"; paintCoins(); }); }
setInterval(function(){ $$("[data-dl]").forEach(function(e){ var d = +e.getAttribute("data-dl"); if (d) e.textContent = H.left(d - Date.now()); }); }, 1000);
H.config().then(function(c){ var ta = $("#tagaddr"); if (ta) ta.innerHTML = c.tag ? "<a href=\"" + H.scan("account", c.tag) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--g)\">" + c.tag + "</a>" : "set when heir goes live"; loadCoins(); });
setInterval(loadCoins, 60000);
})();
