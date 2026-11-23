// gate.js: the homepage plays one sweep of a heart monitor. the pulse fades, the line goes flat,
// the seal stamps down and the fees fan out to 50 heirs. then the doors open.
(function(){
"use strict";
var H = window.HEIR, $ = H.$, GOLD = "#e8c15a", IV = "#f3ede0";
var cv = $("#gatecv"), c = cv.getContext("2d"), W = 0, Hh = 0, DPR = 1, G = null;
var T0 = performance.now(), seen = false, revealed = false;
try { seen = sessionStorage.getItem("heir.gate") === "1"; sessionStorage.setItem("heir.gate", "1"); } catch (e) {}
// timeline, ms
var SWEEP0 = 500, SWEEP1 = 4300, STAMP = 4300, FAN0 = 4700, FAN1 = 6100, REVEAL = 5500, END = 6400;
if (seen) T0 -= 4000;
if (H.RM) T0 -= END;
function rgba(h, a){ var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function easeOut(p){ return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }
function back(p){ p = clamp(p, 0, 1); var s = 1.9; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); }
// one heartbeat over q in 0..1
function ecg(q){ if (q < 0 || q > 1) return 0; if (q < .1) return Math.sin(q / .1 * Math.PI) * .12; if (q < .16) return 0; if (q < .19) return -(q - .16) / .03 * .18; if (q < .23) return -.18 + (q - .19) / .04 * 1.18; if (q < .28) return 1 - (q - .23) / .05 * 1.42; if (q < .31) return -.42 + (q - .28) / .03 * .42; if (q < .42) return 0; if (q < .58) return Math.sin((q - .42) / .16 * Math.PI) * .22; return 0; }
var BEATS, FLAT = .8, BW;
function layout(){
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth;
  if (innerWidth < 700) { BEATS = [[.22, 1], [.56, .55]]; BW = .3; } else { BEATS = [[.12, 1], [.32, .74], [.52, .48], [.7, .24]]; BW = .1; } Hh = innerHeight; cv.width = W * DPR; cv.height = Hh * DPR; c.setTransform(DPR, 0, 0, DPR, 0, 0);
  var copy = $("#gcopy").getBoundingClientRect(), sy = Hh * (W < 700 ? .34 : .4), sr = clamp(Math.min(W, Hh) * .07, 28, 62), sx = W * .5;
  var L = W * .04, E = sx - sr - 8, amp = Math.min(Hh * .17, 140), ymax = Math.max(sy + 30, copy.top - 26), ymin = Math.max(70, sy - Hh * .3);
  var dots = [], rings = [[6], [8], [10], [12], [14]], R0 = sr * 2.1, R1 = Math.max(R0 + 60, Math.min(W * .45, W - sx - 26));
  rings.forEach(function(r, k){ var R = R0 + k * (R1 - R0) / 4, up = Math.asin(clamp((sy - ymin) / R, 0, 1)), dn = Math.asin(clamp((ymax - sy) / R, 0, 1)), n = r[0];
    for (var i = 0; i < n; i++) { var a = -up * .96 + (up + dn) * .96 * (i + .5) / n; dots.push({ x: Math.min(W - 18, sx + Math.cos(a) * R), y: sy + Math.sin(a) * R, k: k, ph: Math.random(), tw: Math.random() * 6 }); } });
  G = { sx: sx, sy: sy, sr: sr, L: L, E: E, amp: amp, dots: dots, grid: null };
  // the monitor grid, drawn once
  var g = document.createElement("canvas"); g.width = W * DPR; g.height = Hh * DPR; var gc = g.getContext("2d"); gc.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (var x = 0; x < W; x += 24) { gc.strokeStyle = x % 120 ? "rgba(243,237,224,.025)" : "rgba(243,237,224,.05)"; gc.beginPath(); gc.moveTo(x + .5, 0); gc.lineTo(x + .5, Hh); gc.stroke(); }
  for (var y = (sy % 24); y < Hh; y += 24) { gc.strokeStyle = Math.abs(y - sy) % 120 < 1 ? "rgba(243,237,224,.05)" : "rgba(243,237,224,.025)"; gc.beginPath(); gc.moveTo(0, y + .5); gc.lineTo(W, y + .5); gc.stroke(); }
  var m = gc.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, Hh) * .75); m.addColorStop(0, "rgba(6,6,7,0)"); m.addColorStop(1, "rgba(6,6,7,1)"); gc.fillStyle = m; gc.fillRect(0, 0, W, Hh);
  G.grid = g;
}
function yAt(p){ var y = 0; BEATS.forEach(function(b){ y += b[1] * ecg((p - b[0]) / BW + .5); }); return G.sy - G.amp * y; }
function draw(now){
  var t = now - T0, g = G; c.clearRect(0, 0, W, Hh);
  c.globalAlpha = easeOut((t) / 700); c.drawImage(g.grid, 0, 0, W, Hh); c.globalAlpha = 1;
  // the sweep
  var p = clamp((t - SWEEP0) / (SWEEP1 - SWEEP0), 0, 1), hx = g.L + (g.E - g.L) * p, span = g.E - g.L;
  if (t > SWEEP0) {
    c.lineJoin = "round"; c.lineCap = "round";
    var steps = Math.max(2, Math.floor((hx - g.L) / 2));
    for (var pass = 0; pass < 2; pass++) {
      c.beginPath(); var started = false, flatStart = null;
      for (var i = 0; i <= steps; i++) { var x = g.L + (hx - g.L) * i / steps, pp = (x - g.L) / span; if (pp > FLAT && flatStart == null) flatStart = x; if (pp > FLAT) continue; var y = yAt(pp); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); }
      var grad = c.createLinearGradient(g.L, 0, Math.max(g.L + 1, hx), 0); grad.addColorStop(0, rgba(IV, 0)); grad.addColorStop(.35, rgba(IV, pass ? .9 : .25)); grad.addColorStop(1, rgba(IV, pass ? 1 : .35));
      c.strokeStyle = grad; c.lineWidth = pass ? 2.2 : 7; if (!pass) c.filter = "blur(4px)"; c.stroke(); c.filter = "none";
      if (flatStart != null) { c.strokeStyle = rgba(GOLD, pass ? .95 : .3); c.lineWidth = pass ? 2.2 : 7; c.setLineDash(pass ? [1, 9] : []); if (!pass) c.filter = "blur(4px)"; c.beginPath(); c.moveTo(flatStart, g.sy); c.lineTo(hx, g.sy); c.stroke(); c.setLineDash([]); c.filter = "none"; }
    }
    if (p < 1) { var hy = (hx - g.L) / span > FLAT ? g.sy : yAt((hx - g.L) / span), hot = (hx - g.L) / span > FLAT ? GOLD : IV;
      var hg = c.createRadialGradient(hx, hy, 0, hx, hy, 26); hg.addColorStop(0, rgba(hot, .55)); hg.addColorStop(1, rgba(hot, 0)); c.fillStyle = hg; c.beginPath(); c.arc(hx, hy, 26, 0, 7); c.fill();
      c.fillStyle = hot; c.beginPath(); c.arc(hx, hy, 3.4, 0, 7); c.fill(); }
  }
  // the timer above the seal: 72 hours run out across the sweep
  var tm = $("#gtimer"), hrs = 72 * (1 - clamp(p / FLAT, 0, 1));
  if (tm && !revealed) { tm.innerHTML = (hrs <= 0 ? "switch fired · " : "switch in ") + "<b>" + H.left(hrs * 3600e3) + "</b>"; tm.classList.toggle("done", hrs <= 0); }
  // the seal stamps down
  var st = (t - STAMP) / 520;
  if (st > 0) {
    var sc = st < 1 ? 2.3 - 1.3 * back(st) : 1 + .015 * Math.sin(now / 700), a = clamp(st * 2, 0, 1), sx = g.sx, sy = g.sy, sr = g.sr * sc;
    var fl = (t - STAMP - 380) / 900; if (fl > 0 && fl < 1) { c.strokeStyle = rgba(GOLD, .6 * (1 - fl)); c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, g.sr * (1.2 + fl * 4), 0, 7); c.stroke(); }
    var glow = c.createRadialGradient(sx, sy, 0, sx, sy, g.sr * 4.2); glow.addColorStop(0, rgba(GOLD, .3 * a)); glow.addColorStop(1, rgba(GOLD, 0)); c.fillStyle = glow; c.beginPath(); c.arc(sx, sy, g.sr * 4.2, 0, 7); c.fill();
    c.globalAlpha = a; c.save(); c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 24; c.shadowOffsetY = 10 / sc;
    var sg = c.createRadialGradient(sx - sr * .35, sy - sr * .4, 1, sx, sy, sr * 1.1); sg.addColorStop(0, "#fbe39a"); sg.addColorStop(.55, GOLD); sg.addColorStop(1, "#8f6a1a"); c.fillStyle = sg;
    c.beginPath(); for (var j = 0; j <= 90; j++) { var an = j / 90 * Math.PI * 2, rr = sr * (1 + .03 * Math.sin(an * 7 + 1) + .018 * Math.sin(an * 11)); c.lineTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr); } c.fill(); c.restore();
    c.strokeStyle = "rgba(125,90,18,.6)"; c.lineWidth = Math.max(1.5, sr * .05); c.beginPath(); c.arc(sx, sy, sr * .8, 0, 7); c.stroke();
    c.strokeStyle = "rgba(255,243,196,.35)"; c.lineWidth = 1; c.beginPath(); c.arc(sx, sy, sr * .74, 0, 7); c.stroke();
    var q = sr / 60; c.strokeStyle = "#3f2d06"; c.lineWidth = Math.max(2, sr * .085); c.lineJoin = "round"; c.lineCap = "round"; c.beginPath();
    c.moveTo(sx - 42 * q, sy + 4 * q); c.lineTo(sx - 19 * q, sy + 4 * q); c.lineTo(sx - 15 * q, sy + 10 * q); c.lineTo(sx - 9 * q, sy - 34 * q); c.lineTo(sx - 2 * q, sy + 28 * q); c.lineTo(sx + 3 * q, sy + 4 * q); c.lineTo(sx + 42 * q, sy + 4 * q); c.stroke();
    var sh = c.createRadialGradient(sx - sr * .4, sy - sr * .5, 0, sx - sr * .4, sy - sr * .5, sr * .6); sh.addColorStop(0, "rgba(255,246,214,.28)"); sh.addColorStop(1, "rgba(255,246,214,0)"); c.fillStyle = sh; c.beginPath(); c.arc(sx - sr * .4, sy - sr * .5, sr * .6, 0, 7); c.fill();
    c.globalAlpha = 1;
  }
  // the fees fan out to 50 heirs
  var fp = (t - FAN0) / (FAN1 - FAN0);
  if (fp > 0) g.dots.forEach(function(d){
    var e = easeOut(fp * 1.5 - d.k * .14), x0 = g.sx + g.sr * .9, y0 = g.sy, c1x = g.sx + g.sr * 2.2, c2x = d.x - (d.x - g.sx) * .35;
    if (e > 0) { c.strokeStyle = rgba(GOLD, .26 - d.k * .03); c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0);
      var ex = x0 + (d.x - x0) * e, ey = y0 + (d.y - y0) * e; c.bezierCurveTo(c1x, y0, c2x, d.y * e + y0 * (1 - e), ex, ey); c.stroke(); }
    var lit = e >= .999;
    if (lit) { var u = ((now / 1000) * .32 + d.ph) % 1, v = 1 - u, bx = v * v * v * x0 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * d.x, by = v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * d.y + u * u * u * d.y;
      c.fillStyle = rgba("#fff3c4", .85 * Math.sin(u * Math.PI)); c.beginPath(); c.arc(bx, by, 1.5, 0, 7); c.fill(); }
    var tw = .75 + .25 * Math.sin(now / 600 + d.tw), r = (lit ? 4.2 : 3) * (d.k ? 1 - d.k * .06 : 1);
    if (lit) { c.fillStyle = rgba(GOLD, .12 * tw); c.beginPath(); c.arc(d.x, d.y, r * 2.6, 0, 7); c.fill(); }
    c.fillStyle = lit ? rgba(GOLD, tw) : "#2b2822"; c.beginPath(); c.arc(d.x, d.y, r, 0, 7); c.fill(); });
  // after the reveal, a faint echo of the pulse sweeps the dead line now and then
  if (t > END) { var ep = ((t - END) % 7000) / 1800; if (ep < 1) { var ex2 = g.L + (g.E - g.L) * ep; var eg = c.createLinearGradient(ex2 - 120, 0, ex2, 0); eg.addColorStop(0, rgba(GOLD, 0)); eg.addColorStop(1, rgba(GOLD, .5)); c.strokeStyle = eg; c.lineWidth = 2; c.beginPath(); c.moveTo(Math.max(g.L, ex2 - 120), g.sy); c.lineTo(ex2, g.sy); c.stroke(); } }
  if (t > REVEAL && !revealed) { revealed = true; $("#gcopy").classList.add("in"); var tm2 = $("#gtimer"); if (tm2) setTimeout(function(){ tm2.classList.add("hide"); }, 1600); }
}
function skip(){ var t = performance.now() - T0; if (t < REVEAL) T0 = performance.now() - REVEAL - 50; }
document.addEventListener("keydown", function(e){ if (e.key === "Enter" && document.activeElement === document.body) { location.href = "/home"; return; } if (e.key !== "/" && !$("#termpop.open")) skip(); });
cv.addEventListener("pointerdown", skip);
window.addEventListener("resize", function(){ clearTimeout(layout.h); layout.h = setTimeout(layout, 120); });
layout();
function loop(now){ if (!document.hidden) draw(now); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
// live numbers for the footer
H.api("coins").then(function(j){ if (j.error || !j.live) return; $("#g-coins").textContent = j.counts.coins; $("#g-fired").textContent = j.counts.fired; });
})();
