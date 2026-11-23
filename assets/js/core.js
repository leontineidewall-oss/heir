// core.js: shared by every page. formatting, the api, the wallet, the nav and the terminal
(function(){
"use strict";
var H = window.HEIR = {};
var $ = H.$ = function(s, r){ return (r || document).querySelector(s); };
var $$ = H.$$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
H.RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
H.esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
H.short = function(a){ return a ? a.slice(0, 4) + "…" + a.slice(-4) : "—"; };
H.sol = function(v, d){ return v == null || !isFinite(v) ? "—" : "◎ " + Number(v).toFixed(d == null ? (v >= 100 ? 1 : v >= 1 ? 3 : 4) : d); };
H.usd = function(v){ if (v == null || !isFinite(v)) return "—"; var a = Math.abs(v); return a >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : a >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M" : a >= 1e3 ? "$" + (v / 1e3).toFixed(1) + "K" : "$" + v.toFixed(2); };
H.pct = function(v, d){ return v == null ? "—" : (v * 100).toFixed(d == null ? 2 : d) + "%"; };
H.ago = function(t){ if (!t) return "—"; var s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? Math.floor(s) + "s ago" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : Math.floor(s / 86400) + "d ago"; };
H.left = function(ms){ if (ms == null) return "—"; ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; };
H.isAddr = function(s){ return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s || ""); };
H.scan = function(kind, id){ return "https://solscan.io/" + kind + "/" + id; };
H.toast = function(t){ var e = $("#toast"); if (!e) { e = document.createElement("div"); e.id = "toast"; document.body.appendChild(e); } e.textContent = t; e.classList.add("show"); clearTimeout(H.toast.h); H.toast.h = setTimeout(function(){ e.classList.remove("show"); }, 2400); };
H.copy = function(t){ if (!t) return H.toast("—"); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ H.toast("copied"); }, function(){ H.toast(t); }); };
H.api = function(action, params, method){ var u = "/api/heir?action=" + action; if (params) Object.keys(params).forEach(function(k){ u += "&" + k + "=" + encodeURIComponent(params[k]); });
  return fetch(u, { method: method || "GET", cache: "no-store" }).then(function(r){ return r.json().then(function(j){ if (!r.ok && !j.error) j.error = "unavailable right now"; j._code = r.status; return j; }); }, function(){ return { error: "can't reach heir right now" }; }); };
// coin avatar: its image, or a gold initial
H.ava = function(c, sz){ var s = sz || 44; return c && c.img ? "<i class=\"ava\" style=\"width:" + s + "px;height:" + s + "px;background-image:url('" + H.esc(c.img) + "')\"></i>" : "<i class=\"ava\" style=\"width:" + s + "px;height:" + s + "px\">" + H.esc(((c && c.sym) || "?").slice(0, 1)) + "</i>"; };
H.name = function(c){ return c && c.sym ? "$" + c.sym : H.short(c && c.mint); };
/* ---------- config + sol price ---------- */
H.cfg = null; var cfgP = null;
H.config = function(){ return cfgP || (cfgP = H.api("config").then(function(c){ H.cfg = c; $$("[data-sol]").forEach(function(e){ e.textContent = c.sol ? "$" + c.sol.toFixed(2) : "—"; }); return c; })); };
/* ---------- wallet (phantom and anything that speaks its api) ---------- */
H.prov = function(){ return (window.phantom && window.phantom.solana) || window.solana || null; };
H.wallet = null;
H.connect = function(silent){ var p = H.prov(); if (!p) { if (!silent) { H.toast("open this page in a wallet browser, or install Phantom"); } return Promise.resolve(null); }
  return p.connect(silent ? { onlyIfTrusted: true } : undefined).then(function(r){ H.wallet = (r.publicKey || p.publicKey).toString(); paintWallet(); document.dispatchEvent(new CustomEvent("heir:wallet")); return H.wallet; }, function(){ return null; }); };
function paintWallet(){ $$("[data-connect]").forEach(function(b){ b.textContent = H.wallet ? H.short(H.wallet) : "connect"; }); }
H.signSend = function(b58tx){ var p = H.prov(); if (!p) return Promise.reject(new Error("no wallet"));
  return p.request({ method: "signAndSendTransaction", params: { message: b58tx } }).then(function(r){ return r.signature || r; }); };
document.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest("[data-connect]"); if (b) { e.preventDefault(); H.connect(false); }
  var c = e.target.closest && e.target.closest("[data-copy]"); if (c) { e.preventDefault(); H.copy(c.getAttribute("data-copy")); } });
/* ---------- nav: solid on scroll, progress line, current section ---------- */
var nav = $("nav.top"), prog = $(".prog");
function onScroll(){ var y = window.scrollY; if (nav) nav.classList.toggle("solid", y > 20); if (prog) prog.style.transform = "scaleX(" + Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - innerHeight)) + ")";
  var cur = null; $$(".links a[href^='#']").forEach(function(a){ var t = $(a.getAttribute("href")); if (t && t.getBoundingClientRect().top < 160) cur = a; }); $$(".links a").forEach(function(a){ a.classList.toggle("on", a === cur); }); }
window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
/* ---------- reveal ---------- */
if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" }); $$(".reveal").forEach(function(e){ io.observe(e); }); } else $$(".reveal").forEach(function(e){ e.classList.add("in"); });
/* ---------- a soft light follows the pointer across windows ---------- */
document.addEventListener("pointermove", function(e){ var w = e.target.closest && e.target.closest(".win"); if (!w) return; var r = w.getBoundingClientRect(); w.style.setProperty("--mx", (e.clientX - r.left) + "px"); w.style.setProperty("--my", (e.clientY - r.top) + "px"); }, { passive: true });
/* ---------- the terminal: works on every page ---------- */
var CMDS = {}, hist = [], hi = 0;
H.cmd = function(name, help, fn){ CMDS[name] = { help: help, fn: fn }; };
function out(body, html, cls){ var d = document.createElement("div"); if (cls) d.className = cls; if (html) d.innerHTML = html; else d.textContent = html === "" ? "" : body; if (html) d.innerHTML = body; body = null; return d; }
H.print = function(el, text, cls){ var d = document.createElement("div"); if (cls) d.className = cls; d.innerHTML = text; el.appendChild(d); el.scrollTop = el.scrollHeight; };
H.run = function(line, el){
  line = String(line || "").trim(); if (!line) return; hist.push(line); hi = hist.length;
  var d = document.createElement("div"); d.className = "c"; d.textContent = line; el.appendChild(d);
  var p = line.split(/\s+/), c = CMDS[p[0].toLowerCase()];
  if (!c) { H.print(el, "unknown command: " + H.esc(p[0]) + ". type <b>help</b>", "e"); return; }
  Promise.resolve(c.fn(p.slice(1), el)).then(function(r){ if (r) H.print(el, r); el.scrollTop = el.scrollHeight; }, function(e){ H.print(el, H.esc(e.message || e), "e"); });
};
H.cmd("help", "every command", function(){ return Object.keys(CMDS).map(function(k){ return "<b>" + (k + "            ").slice(0, 12) + "</b>" + CMDS[k].help; }).join("\n"); });
H.cmd("clear", "clear the screen", function(a, el){ el.innerHTML = ""; });
H.cmd("rules", "the rules, in numbers", function(){ return "check-in window   <b>72h</b>\ncosts the dev     <b>one signature</b> + the network fee\nheirs             <b>top 50</b> wallets by bag\nsplit             by bag, among the 50\nsmallest cut      <b>◎ 0.001</b> (smaller cuts drop)\nnever inherit     pools, program accounts, the dev, the vault\nwhile alive       the vault pays the dev\nafter it fires    the vault pays the heirs, forever"; });
H.cmd("price", "SOL price", function(){ return H.config().then(function(c){ return c.sol ? "SOL <b>$" + c.sol.toFixed(2) + "</b>" : "SOL price unavailable right now"; }); });
H.cmd("coins", "every coin on heir", function(){ return H.api("coins").then(function(j){ if (j.error) throw new Error(j.error); if (!j.coins.length) return "no coins on heir yet. the first one shows up here the minute its dev signs."; return j.coins.map(function(c){ return (H.name(c) + "            ").slice(0, 12) + (c.state === "fired" ? "<b>fired</b>  " : "alive  ") + (c.state === "fired" ? "vault " + H.sol(c.bal) : "switch in " + H.left(c.deadline - Date.now())) + "  <a href=\"/app#coin/" + c.mint + "\">open</a>"; }).join("\n"); }); });
H.cmd("status", "status <mint>: one coin's switch", function(a){ if (!H.isAddr(a[0])) throw new Error("usage: status <mint>"); return H.api("coin", { mint: a[0] }).then(function(c){ if (c.error) throw new Error(c.error); return H.name(c) + "  " + (c.state === "fired" ? "<b>fired " + H.ago(c.firedAt) + "</b>" : "alive · switch in <b>" + H.left(c.deadline - Date.now()) + "</b>") + "\ncheck-ins  " + c.checkins.length + "\nvault      " + H.sol(c.bal) + "\nheirs      " + (c.heirs ? c.heirs.length : "—"); }); });
H.cmd("split", "split <vault ◎> <your bag %> <top 50 hold %>", function(a){ var v = +a[0], b = +a[1], t = +a[2]; if (!(v > 0 && b > 0 && t > 0)) throw new Error("usage: split 10 0.5 40"); b = Math.min(b, t); var cut = Math.max(0, v - 0.001) * b / t; return "your cut  <b>" + H.sol(cut) + "</b>  (" + (b / t * 100).toFixed(2) + "% of the payout)" + (cut < 0.001 ? "\nunder ◎0.001, so it drops this round" : ""); });
H.cmd("add", "add your coin", function(){ location.href = "/app#add"; return "opening the app…"; });
H.cmd("app", "open the app", function(){ location.href = "/app"; return "opening the app…"; });
H.cmd("docs", "read the manual", function(){ location.href = "/docs"; return "opening the docs…"; });
H.cmd("connect", "connect your wallet", function(){ return H.connect(false).then(function(w){ return w ? "connected <b>" + H.short(w) + "</b>" : "no wallet connected"; }); });
H.cmd("goto", "goto <section>", function(a){ var t = a[0] && document.getElementById(a[0]); if (!t) { if (location.pathname !== "/") { location.href = "/#" + (a[0] || ""); return "…"; } throw new Error("sections: " + $$("section[id]").map(function(s){ return s.id; }).join(", ")); } t.scrollIntoView({ behavior: H.RM ? "auto" : "smooth" }); return "→ " + a[0]; });
H.cmd("about", "what heir is", function(){ return "heir is a dead dev switch for pump.fun coins.\nthe dev checks in every 72h with one signature.\nmiss one and the creator fees pass to the top 50 holders, forever.\nno token needed. the chain is the database."; });
// wire a terminal window
H.term = function(root){
  var body = $(".body", root), inp = $("input", root), form = $("form", root);
  H.print(body, "<b>heir terminal</b> · type <b>help</b> · ↑↓ history · tab completes");
  form.addEventListener("submit", function(e){ e.preventDefault(); H.run(inp.value, body); inp.value = ""; });
  inp.addEventListener("keydown", function(e){
    if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (hi < hist.length - 1) inp.value = hist[++hi]; else { hi = hist.length; inp.value = ""; } }
    else if (e.key === "Tab") { e.preventDefault(); var m = Object.keys(CMDS).filter(function(k){ return k.indexOf(inp.value) === 0; }); if (m.length === 1) inp.value = m[0] + " "; else if (m.length) H.print(body, m.join("  ")); }
    else if (e.key === "Escape") { var pop = $("#termpop"); if (pop) pop.classList.remove("open"); inp.blur(); } });
  return { body: body, inp: inp };
};
function termWin(){ return "<div class=\"win term\"><div class=\"bar\"><i></i><i></i><i></i><span style=\"margin-left:14px\">heir@solana:~</span><span class=\"r\"><kbd>esc</kbd></span></div><div class=\"body\"></div><form><span>›</span><input autocomplete=\"off\" spellcheck=\"false\" placeholder=\"type help\" aria-label=\"terminal\"></form></div>"; }
H.termWin = termWin;
document.addEventListener("DOMContentLoaded", function(){
  var fab = document.createElement("button"); fab.id = "termfab"; fab.setAttribute("aria-label", "open the terminal"); fab.textContent = ">_"; document.body.appendChild(fab);
  var pop = document.createElement("div"); pop.id = "termpop"; pop.innerHTML = termWin(); document.body.appendChild(pop); var T = H.term(pop);
  function open(){ pop.classList.toggle("open"); if (pop.classList.contains("open")) setTimeout(function(){ T.inp.focus(); }, 30); }
  fab.addEventListener("click", open);
  document.addEventListener("keydown", function(e){ var tag = (e.target.tagName || "").toLowerCase(); if (e.key === "/" && tag !== "input" && tag !== "textarea") { e.preventDefault(); if (!pop.classList.contains("open")) open(); else T.inp.focus(); } });
  H.config(); H.connect(true);
});
})();
