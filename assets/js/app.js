// app.js: the board, a coin's page, and adding a coin. routes live in the hash: #board, #add, #coin/<mint>
(function(){
"use strict";
var H = window.HEIR, $ = H.$, $$ = H.$$, esc = H.esc, GOLD = "#e8c15a", IV = "#f3ede0", view = $("#view");
var ST = { coins: null, live: null, filter: "all", q: "", coin: null, add: { mint: "", info: null } };
function fit(cv){ var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); return { c: c, w: r.width, h: r.height }; }
function rgba(h, a){ var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
function win(title, right, body, cls){ return "<div class=\"win " + (cls || "") + "\"><div class=\"bar\"><i></i><i></i><i></i><span style=\"margin-left:14px\">" + title + "</span><span class=\"r\">" + (right || "") + "</span></div>" + body + "</div>"; }
function state(c){ return c.state === "fired" ? "<span class=\"tag fired\"><i class=\"dot g\"></i>fired " + H.ago(c.firedAt) + "</span>" : "<span class=\"tag\"><i class=\"dot\"></i>alive</span>"; }
function notLive(){ return ST.live === false ? "<div class=\"notice\"><b>heir isn't open yet.</b> the board fills in as soon as heir's vault secret is set. nothing here is made up in the meantime.</div>" : ""; }
/* ---------- routing ---------- */
function route(){ var h = location.hash.replace(/^#/, ""), p = h.split("/");
  $$(".tabs a[data-tab]").forEach(function(a){ a.classList.toggle("on", a.dataset.tab === (p[0] === "coin" ? "board" : p[0] || "board")); });
  clearInterval(route.t); cancelAnimationFrame(route.raf); window.scrollTo(0, 0);
  if (p[0] === "coin" && H.isAddr(p[1])) return coin(p[1], p[2] === "new"); if (p[0] === "add") return add(); return board(); }
window.addEventListener("hashchange", route);
/* ---------- board ---------- */
function load(fresh){ return H.api("coins", fresh ? { fresh: 1 } : null).then(function(j){ if (j.error) { ST.err = j.error; return; } ST.err = null; ST.live = j.live; ST.coins = j.coins || []; ST.counts = j.counts; }); }
function board(){
  view.innerHTML = "<div class=\"head\"><div><div class=\"eyebrow\">the board</div><h1>every coin on heir.</h1><p>live from the chain. each row is a dev's pulse: alive while they check in every 72 hours, fired for good when they don't.</p></div><a class=\"btn gold\" href=\"#add\">add your coin</a></div><div id=\"bn\"></div>" +
    win("heir://board.db", "<span id=\"bt\">reading the chain…</span>", "<div class=\"cells\" style=\"border-top:0;border-bottom:1px solid var(--line)\"><div><div class=\"k\">coins on heir</div><div class=\"v\" id=\"b1\">—</div></div><div><div class=\"k\">alive</div><div class=\"v\" id=\"b2\">—</div></div><div><div class=\"k\">fired</div><div class=\"v g\" id=\"b3\">—</div></div><div><div class=\"k\">SOL in vaults</div><div class=\"v\" id=\"b4\">—</div></div></div>" +
    "<div class=\"toolbar\"><div class=\"chips\">" + ["all", "alive", "fired", "mine"].map(function(f){ return "<button class=\"chip" + (ST.filter === f ? " on" : "") + "\" data-f=\"" + f + "\">" + f + "</button>"; }).join("") + "</div><input class=\"search\" id=\"q\" placeholder=\"search $ticker or address\" value=\"" + esc(ST.q) + "\" aria-label=\"search\"></div>" +
    "<div class=\"scroll\"><table class=\"tbl\"><thead><tr><th>coin</th><th>state</th><th>switch</th><th class=\"hide-sm\">check-ins</th><th>vault</th><th class=\"hide-sm\">dev</th></tr></thead><tbody id=\"rows\"><tr><td colspan=\"6\" class=\"empty\">reading the chain…</td></tr></tbody></table></div>");
  $$(".chip").forEach(function(b){ b.addEventListener("click", function(){ ST.filter = b.dataset.f; if (ST.filter === "mine" && !H.wallet) H.connect(false); $$(".chip").forEach(function(x){ x.classList.toggle("on", x === b); }); rows(); }); });
  $("#q").addEventListener("input", function(e){ ST.q = e.target.value.trim(); rows(); });
  load().then(paintBoard); route.t = setInterval(function(){ $$("[data-dl]").forEach(function(e){ var d = +e.getAttribute("data-dl"); e.textContent = H.left(d - Date.now()); }); }, 1000);
}
function paintBoard(){ if (!$("#rows")) return; $("#bn").innerHTML = notLive();
  if (ST.err) { $("#rows").innerHTML = "<tr><td colspan=\"6\" class=\"empty\">the registry is unreachable right now. it comes back on its own.</td></tr>"; $("#bt").textContent = "offline"; return; }
  var c = ST.counts || {}; $("#b1").textContent = ST.live ? c.coins : "—"; $("#b2").textContent = ST.live ? c.alive : "—"; $("#b3").textContent = ST.live ? c.fired : "—"; $("#b4").textContent = ST.live ? H.sol(c.vaults) : "—"; $("#bt").textContent = "updated " + H.ago(Date.now()); rows(); }
function rows(){ var el = $("#rows"); if (!el || !ST.coins) return; var q = ST.q.toLowerCase().replace(/^\$/, "");
  var list = ST.coins.filter(function(c){ return (ST.filter === "all" || (ST.filter === "mine" ? H.wallet && c.dev === H.wallet : c.state === ST.filter)) && (!q || c.mint.toLowerCase().indexOf(q) === 0 || (c.sym || "").toLowerCase().indexOf(q) >= 0); });
  list.sort(function(a, b){ return a.state === b.state ? (a.state === "alive" ? a.deadline - b.deadline : b.firedAt - a.firedAt) : a.state === "fired" ? -1 : 1; });
  if (!list.length) { el.innerHTML = "<tr><td colspan=\"6\" class=\"empty\">" + (!ST.coins.length ? (ST.live === false ? "heir opens as soon as its vault secret is set." : "no coins on heir yet. the first one shows up here the minute its dev signs.") : ST.filter === "mine" && !H.wallet ? "connect your wallet to see your coins." : "nothing matches.") + "</td></tr>"; return; }
  el.innerHTML = list.map(function(c){ var f = c.state === "fired"; return "<tr class=\"row\" data-m=\"" + c.mint + "\"><td><div class=\"cn\">" + H.ava(c, 34) + "<div><b>" + esc(H.name(c)) + "</b><small>" + H.short(c.mint) + "</small></div></div></td><td>" + state(c) + "</td><td>" + (f ? "<span class=\"gold\">fees → heirs</span>" : "<b data-dl=\"" + c.deadline + "\">" + H.left(c.deadline - Date.now()) + "</b>") + "</td><td class=\"hide-sm\">" + c.beats + "</td><td><b" + (f ? " style=\"color:var(--g)\"" : "") + ">" + H.sol(c.bal) + "</b></td><td class=\"hide-sm\">" + H.short(c.dev) + "</td></tr>"; }).join("");
  $$(".row", el).forEach(function(r){ r.addEventListener("click", function(){ location.hash = "coin/" + r.dataset.m; }); }); }
document.addEventListener("heir:wallet", function(){ if ($("#rows")) rows(); if (ST.coin) paintCoin(); if ($("#addf")) paintAdd(); });
/* ---------- one coin ---------- */
function coin(mint, fresh){
  ST.coin = null; view.innerHTML = "<a href=\"#board\" class=\"dim\" style=\"text-decoration:none;font:600 13px var(--mo)\">← the board</a><div id=\"cv\" style=\"margin-top:18px\"><div class=\"empty\">reading the chain…</div></div>";
  function get(fresh){ return H.api("coin", fresh ? { mint: mint, fresh: 1 } : { mint: mint }).then(function(j){ if (j.error) { $("#cv").innerHTML = "<div class=\"win\"><div class=\"empty\">" + esc(j.error) + (j.notOnHeir ? ". <a href=\"#add\" style=\"color:var(--g)\">add it →</a>" : "") + "</div></div>"; return; } ST.coin = j; paintCoin(); }); }
  get(fresh); route.t = setInterval(function(){ var c = ST.coin; if (!c) return; var e = $("#c-in"); if (e && c.state === "alive") e.textContent = H.left(c.deadline - Date.now()); }, 1000);
  coin.refresh = get;
}
function paintCoin(){ var c = ST.coin, el = $("#cv"); if (!c || !el) return; var f = c.state === "fired", me = H.wallet && H.wallet === c.dev, links = "<a href=\"https://pump.fun/coin/" + c.mint + "\" target=\"_blank\" rel=\"noopener\">pump.fun ↗</a><a href=\"https://dexscreener.com/solana/" + c.mint + "\" target=\"_blank\" rel=\"noopener\">chart ↗</a><a href=\"" + H.scan("token", c.mint) + "\" target=\"_blank\" rel=\"noopener\">solscan ↗</a>";
  var inLedger = (c.ledger || []).filter(function(x){ return x.d > 0; }).reduce(function(s, x){ return s + x.d; }, 0);
  var acts = "";
  if (!f && me) acts += "<button class=\"btn gold\" id=\"ck\">check in now</button>";
  if (!f && c.bal >= .011) acts += "<button class=\"btn\" id=\"col\">pay the vault to the dev</button>";
  if (f) acts += "<button class=\"btn gold\" id=\"pay\"" + (c.bal >= .021 ? "" : " disabled") + ">run payout to the heirs</button>";
  var why = f ? "the switch fired " + H.ago(c.firedAt) + ". every payout splits the vault by bag among the <b>top 50 holders</b>. anyone can run it, and heir sweeps fired vaults once a day. it runs at ◎0.02 or more." : me ? "you're the dev. check in before the timer hits zero. every check-in also pays the vault back to you." : "while the dev keeps checking in, the vault pays the dev. if 72 hours pass with no check-in, it pays the <b>top 50 holders</b> from then on.";
  el.innerHTML = "<div class=\"coinhead\">" + H.ava(c, 64) + "<div><h1>" + esc(H.name(c)) + "</h1><div class=\"sub\"><span>" + esc(c.name || "") + "</span><a href=\"#\" data-copy=\"" + c.mint + "\">" + H.short(c.mint) + " ⧉</a>" + links + "</div></div><div class=\"r\">" + state(c) + "</div></div>" +
    "<div class=\"cgrid\"><div>" + win("heir://" + esc((c.sym || "coin").toLowerCase()) + ".exe", c.checkins.length + " beats since " + new Date(c.registered).toISOString().slice(0, 10), "<canvas id=\"cmon\" aria-label=\"this coin's check-ins over time\"></canvas><div class=\"cells\"><div><div class=\"k\">" + (f ? "fired" : "switch in") + "</div><div class=\"v" + (f ? " g" : "") + "\" id=\"c-in\">" + (f ? H.ago(c.firedAt) : H.left(c.deadline - Date.now())) + "</div></div><div><div class=\"k\">last check-in</div><div class=\"v\">" + H.ago(c.last) + "</div></div><div><div class=\"k\">check-ins</div><div class=\"v\">" + c.checkins.length + "</div></div><div><div class=\"k\">market cap</div><div class=\"v\">" + H.usd(c.mcap) + "</div></div></div>") + "</div>" +
    win("heir://vault", f ? "pays the heirs" : "pays the dev", "<div class=\"vault\"><div class=\"k\">in the vault</div><div class=\"big\" style=\"margin-top:8px\">" + (c.bal == null ? "—" : c.bal.toFixed(4)) + "<small>SOL</small></div><div class=\"addr\"><span style=\"flex:1\">" + esc(c.vault) + "</span><button data-copy=\"" + c.vault + "\">copy</button></div><div class=\"why\">fees landed in the last 25 moves: <b>" + H.sol(inLedger) + "</b><br>dev wallet: <a href=\"" + H.scan("account", c.dev) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--t2)\">" + H.short(c.dev) + "</a></div><div class=\"acts\">" + acts + "</div><div class=\"why\" id=\"actmsg\">" + why + "</div></div>") + "</div>" +
    win("heir://heirs.db", (c.holders ? c.holders + " holders · top 50 hold <b>" + H.pct(c.topShare, 1) + "</b> of the supply" : ""), heirsTable(c), "sec") +
    win("heir://ledger", "the vault's last 25 moves", ledgerTable(c), "sec") +
    win("heir://beats", "every check-in, on-chain", beatsTable(c), "sec");
  var b; if ((b = $("#ck"))) b.addEventListener("click", checkin); if ((b = $("#col"))) b.addEventListener("click", function(){ pay(false); }); if ((b = $("#pay"))) b.addEventListener("click", function(){ pay(true); });
  drawCoin();
}
function heirsTable(c){ if (!c.heirs) return "<div class=\"empty\">" + esc(c.heirsError ? "the holder list is unavailable right now (" + c.heirsError + ")" : "—") + "</div>";
  if (!c.heirs.length) return "<div class=\"empty\">no holders yet.</div>";
  var cut = {}; (c.preview || []).forEach(function(p){ cut[p.w] = p.cut; }); var mx = c.heirs[0].share || 1;
  return "<div class=\"scroll\"><table class=\"tbl\"><thead><tr><th>#</th><th>wallet</th><th class=\"hide-sm\">of the supply</th><th>share of a payout</th><th>" + (c.state === "fired" ? "cut right now" : "cut if it fired now") + "</th></tr></thead><tbody>" + c.heirs.map(function(h, i){ var me = H.wallet === h.w; return "<tr" + (me ? " class=\"hi\"" : "") + "><td>" + (i + 1) + "</td><td><a href=\"" + H.scan("account", h.w) + "\" target=\"_blank\" rel=\"noopener\">" + H.short(h.w) + "</a>" + (me ? " <span class=\"gold\">you</span>" : "") + "</td><td class=\"hide-sm\">" + H.pct(h.ofSupply) + "</td><td><span class=\"mini\"><i style=\"width:" + (h.share / mx * 100).toFixed(1) + "%\"></i></span>" + H.pct(h.share) + "</td><td>" + (cut[h.w] ? "<b>" + H.sol(cut[h.w], 4) + "</b>" : "<span class=\"dim\">under ◎0.001</span>") + "</td></tr>"; }).join("") + "</tbody></table></div>"; }
function ledgerTable(c){ var l = c.ledger || []; if (!l.length) return "<div class=\"empty\">no moves yet. the first fee that lands shows up here.</div>";
  return "<table class=\"tbl\"><thead><tr><th>when</th><th>what</th><th>SOL</th><th class=\"hide-sm\">tx</th></tr></thead><tbody>" + l.map(function(x){ return "<tr><td>" + H.ago(x.t) + "</td><td>" + (x.err ? "failed" : x.d > 0 ? "fees landed" : c.state === "fired" ? "paid " + x.n + " heir" + (x.n === 1 ? "" : "s") : "paid the dev") + "</td><td" + (x.d > 0 ? "" : " class=\"g\"") + "><b" + (x.d > 0 ? "" : " style=\"color:var(--g)\"") + ">" + (x.d > 0 ? "+" : "") + x.d.toFixed(4) + "</b></td><td class=\"hide-sm\"><a href=\"" + H.scan("tx", x.sig) + "\" target=\"_blank\" rel=\"noopener\">" + H.short(x.sig) + " ↗</a></td></tr>"; }).join("") + "</tbody></table>"; }
function beatsTable(c){ return "<div class=\"scroll\" style=\"max-height:300px\"><table class=\"tbl\"><thead><tr><th>#</th><th>when</th><th>gap</th><th class=\"hide-sm\">tx</th></tr></thead><tbody>" + c.checkins.slice().reverse().map(function(b, i, arr){ var prev = arr[i + 1], gap = prev ? (b.t - prev.t) / 3600e3 : null; return "<tr><td>" + (arr.length - i) + "</td><td>" + new Date(b.t).toISOString().replace("T", " ").slice(0, 16) + " UTC" + (i === arr.length - 1 ? " <span class=\"dim\">· added</span>" : "") + "</td><td>" + (gap == null ? "—" : gap.toFixed(1) + "h") + "</td><td class=\"hide-sm\"><a href=\"" + H.scan("tx", b.sig) + "\" target=\"_blank\" rel=\"noopener\">" + H.short(b.sig) + " ↗</a></td></tr>"; }).join("") + "</tbody></table></div>"; }
// the coin's pulse: one beat per real check-in on a time axis, then a flatline if it fired
function drawCoin(){ var cv = $("#cmon"); if (!cv) return; var c = ST.coin;
  function frame(now){ if (!$("#cmon") || ST.coin !== c) return; var F = cv._f || (cv._f = fit(cv)), x = F.c, w = F.w, h = F.h, t = now / 1000;
    x.clearRect(0, 0, w, h); x.strokeStyle = "rgba(243,237,224,.04)"; for (var gx = 0; gx < w; gx += 20) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, h); x.stroke(); } for (var gy = 0; gy < h; gy += 20) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(w, gy + .5); x.stroke(); }
    var t0 = c.registered, end = c.state === "fired" ? Math.max(Date.now(), c.firedAt + 24 * 3600e3) : c.deadline, span = Math.max(1, end - t0), L = 24, R = w - 24, base = h * .58, X = function(tm){ return L + (tm - t0) / span * (R - L); };
    if (c.state === "alive") { var nx = X(Date.now()); x.fillStyle = rgba(GOLD, .06); x.fillRect(nx, 0, R - nx, h); x.strokeStyle = rgba(GOLD, .5); x.setLineDash([3, 5]); x.beginPath(); x.moveTo(R, 18); x.lineTo(R, h - 18); x.stroke(); x.setLineDash([]); x.fillStyle = GOLD; x.font = "700 10.5px MO, monospace"; x.textAlign = "right"; x.fillText("SWITCH", R - 6, 28); }
    x.beginPath(); x.moveTo(L, base); var beats = c.checkins.map(function(b){ return X(b.t); }), fx = c.firedAt ? X(c.firedAt) : null;
    beats.forEach(function(bx){ x.lineTo(bx - 10, base); x.lineTo(bx - 6, base + 6); x.lineTo(bx - 2, base - h * .34); x.lineTo(bx + 3, base + h * .16); x.lineTo(bx + 6, base); });
    var liveEnd = c.state === "fired" ? fx : X(Date.now()); x.lineTo(liveEnd, base); x.strokeStyle = IV; x.lineWidth = 2; x.lineJoin = "round"; x.shadowColor = IV; x.shadowBlur = 6; x.stroke(); x.shadowBlur = 0;
    if (c.state === "fired") { x.strokeStyle = GOLD; x.setLineDash([2, 7]); x.beginPath(); x.moveTo(fx, base); x.lineTo(R, base); x.stroke(); x.setLineDash([]); x.fillStyle = GOLD; x.beginPath(); x.arc(fx, base, 5, 0, 7); x.fill(); x.font = "700 10.5px MO, monospace"; x.textAlign = "left"; x.fillText("FIRED · 72H WITH NO CHECK-IN", Math.min(fx + 10, R - 200), base - 14); }
    else { var hx = X(Date.now()), pulse = .5 + .5 * Math.sin(t * 5); x.fillStyle = IV; x.beginPath(); x.arc(hx, base, 3.5 + pulse * 1.5, 0, 7); x.fill(); x.fillStyle = rgba(IV, .15); x.beginPath(); x.arc(hx, base, 10 + pulse * 4, 0, 7); x.fill(); }
    x.fillStyle = "#57534a"; x.font = "700 10.5px MO, monospace"; x.textAlign = "left"; x.fillText(new Date(t0).toISOString().slice(0, 10), L, h - 12); x.textAlign = "right"; x.fillText(c.state === "fired" ? "now" : "deadline", R, h - 12);
    route.raf = requestAnimationFrame(frame); }
  cv._f = null; route.raf = requestAnimationFrame(frame); }
window.addEventListener("resize", function(){ var cv = $("#cmon"); if (cv) cv._f = null; });
function msg(html){ var e = $("#actmsg"); if (e) e.innerHTML = html; }
function checkin(){ var c = ST.coin; if (!H.wallet) return H.connect(false);
  msg("building the note…"); H.api("tx", { kind: "checkin", mint: c.mint, wallet: H.wallet }).then(function(j){ if (j.error) throw new Error(j.error); msg("sign <b>" + esc(j.note) + "</b> in your wallet…"); return H.signSend(j.tx); })
    .then(function(sig){ msg("checked in. <a href=\"" + H.scan("tx", sig) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--g)\">view the tx ↗</a> the timer resets once it confirms."); H.toast("checked in");
      setTimeout(function(){ H.api("pay", { mint: c.mint }, "POST").then(function(){ coin.refresh(true); }); }, 6000); })
    .catch(function(e){ msg("<span style=\"color:#e88f7a\">" + esc(e.message || "cancelled") + "</span>"); }); }
function pay(heirs){ var c = ST.coin; msg(heirs ? "paying the heirs…" : "paying the dev…");
  H.api("pay", { mint: c.mint }, "POST").then(function(j){ if (j.error) throw new Error(j.error); msg("sent <b>" + H.sol(j.sent, 4) + "</b> to " + (j.to === "dev" ? "the dev" : j.wallets + " heirs") + ". " + j.sigs.map(function(s){ return "<a href=\"" + H.scan("tx", s) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--g)\">tx ↗</a>"; }).join(" ")); setTimeout(function(){ coin.refresh(true); }, 5000); })
    .catch(function(e){ msg("<span style=\"color:#e88f7a\">" + esc(e.message) + "</span>"); }); }
/* ---------- add a coin ---------- */
function add(){
  view.innerHTML = "<div class=\"head\"><div><div class=\"eyebrow\">add a coin</div><h1>put your coin on the switch.</h1><p>four steps, about a minute. only the wallet that created the coin on pump.fun can add it.</p></div></div><div id=\"an\"></div><div class=\"add\"><div id=\"addf\"></div><div id=\"addp\"></div></div>";
  H.config().then(function(c){ ST.live = c.live; $("#an").innerHTML = notLive(); paintAdd(); });
}
function paintAdd(){ var A = ST.add, i = A.info, el = $("#addf"); if (!el) return;
  var s1 = i && i.pump && !i.onHeir, s2 = s1 && H.wallet && i.creator === H.wallet, step = !s1 ? 1 : !s2 ? 2 : !A.routed ? 3 : 4;
  function S(n, title, body, ctl){ return "<div class=\"stepx" + (n < step ? " done" : n === step ? " cur" : "") + "\"><span class=\"n\">" + (n < step ? "✓" : "0" + n) + "</span><div><h3>" + title + "</h3><p>" + body + "</p>" + (n === step || (n < step && n === 1) ? ctl || "" : "") + "</div></div>"; }
  el.innerHTML = win("heir://add.exe", "step " + step + " of 4",
    S(1, "paste your coin", "the contract address from pump.fun.", "<div class=\"ctl\"><input class=\"f\" id=\"am\" placeholder=\"contract address\" value=\"" + esc(A.mint) + "\" spellcheck=\"false\" autocomplete=\"off\"><button class=\"btn gold\" id=\"ago\">check</button></div><div class=\"res\" id=\"ares\">" + (A.err ? "<span class=\"no\">" + esc(A.err) + "</span>" : i ? (i.onHeir ? "<span class=\"no\">already on heir.</span> <a href=\"#coin/" + i.mint + "\" style=\"color:var(--g)\">open it →</a>" : "<span class=\"ok\">✓ pump.fun coin</span> · creator " + H.short(i.creator)) : "") + "</div>") +
    S(2, "connect the creator wallet", "heir reads the creator from the coin's bonding curve. it has to be this wallet.", "<div class=\"ctl\"><button class=\"btn gold\" data-connect>" + (H.wallet ? H.short(H.wallet) : "connect") + "</button></div><div class=\"res\">" + (H.wallet && i ? (i.creator === H.wallet ? "<span class=\"ok\">✓ this is the creator</span>" : "<span class=\"no\">this wallet isn't the creator (" + H.short(i.creator) + ")</span>") : "") + "</div>") +
    S(3, "route the fees to your vault", "this is your coin's heir vault. on pump.fun, open your coin's creator fees and add this address as the recipient. while you keep checking in, the vault pays everything back to you.", i && i.vault ? "<div class=\"vault\" style=\"padding:0\"><div class=\"addr\"><span style=\"flex:1\">" + esc(i.vault) + "</span><button data-copy=\"" + i.vault + "\">copy</button></div></div><div class=\"ctl\"><button class=\"btn gold\" id=\"arouted\">done, next</button></div>" : "") +
    S(4, "sign the note", "one signature from the creator wallet: <span class=\"mono gold\">heir:1:register</span>. from then on, check in every 72 hours.", "<div class=\"ctl\"><button class=\"btn gold\" id=\"areg\">add to heir</button></div><div class=\"res\" id=\"aregm\"></div>"));
  var p = $("#addp"); p.innerHTML = win("preview", i ? "live" : "", i && i.pump ? "<div class=\"preview\"><div class=\"cn\">" + H.ava(i, 52) + "<div><b>" + esc(H.name(i)) + "</b><small>" + esc(i.name || "") + "</small></div></div><div class=\"cells\" style=\"grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:12px\"><div><div class=\"k\">market cap</div><div class=\"v\">" + H.usd(i.mcap) + "</div></div><div><div class=\"k\">curve</div><div class=\"v\">" + (i.graduated ? "graduated" : "bonding") + "</div></div></div><div class=\"note\">after you sign, this coin gets a 72:00:00 timer. its page shows the pulse, the vault and the 50 heirs in waiting.</div></div>" : "<div class=\"empty\">your coin shows up here.</div>");
  var go = $("#ago"), inp = $("#am"); if (go) { go.addEventListener("click", check); inp.addEventListener("keydown", function(e){ if (e.key === "Enter") check(); }); }
  var r = $("#arouted"); if (r) r.addEventListener("click", function(){ A.routed = true; paintAdd(); });
  var g = $("#areg"); if (g) g.addEventListener("click", register);
}
function check(){ var A = ST.add, m = ($("#am").value || "").trim(); A.mint = m; A.info = null; A.err = null; A.routed = false;
  if (!H.isAddr(m)) { A.err = "that isn't a Solana address"; return paintAdd(); }
  $("#ares").textContent = "reading the bonding curve…";
  H.api("verify", { mint: m, wallet: H.wallet || "" }).then(function(j){ if (j.error && !j.mint) A.err = j.error; else if (!j.pump) A.err = j.error || "that isn't a pump.fun coin"; else A.info = j; paintAdd(); }); }
function register(){ var A = ST.add, m = $("#aregm");
  m.textContent = "building the note…"; H.api("tx", { kind: "register", mint: A.info.mint, wallet: H.wallet }).then(function(j){ if (j.error) throw new Error(j.error); m.innerHTML = "sign <b>" + esc(j.note) + "</b> in your wallet…"; return H.signSend(j.tx); })
    .then(function(sig){ m.innerHTML = "<span class=\"ok\">✓ added.</span> <a href=\"" + H.scan("tx", sig) + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--g)\">view the tx ↗</a> opening your coin…"; setTimeout(function(){ location.hash = "coin/" + A.info.mint + "/new"; }, 6000); })
    .catch(function(e){ m.innerHTML = "<span class=\"no\">" + esc(e.message || "cancelled") + "</span>"; }); }
/* ---------- terminal extras for the app ---------- */
H.cmd("open", "open <mint>: a coin's page", function(a){ if (!H.isAddr(a[0])) throw new Error("usage: open <mint>"); location.hash = "coin/" + a[0]; return "→ " + H.short(a[0]); });
H.cmd("board", "the board", function(){ location.hash = "board"; return "→ board"; });
H.cmd("checkin", "checkin <mint>: sign a check-in (dev only)", function(a){ if (!H.isAddr(a[0])) throw new Error("usage: checkin <mint>"); location.hash = "coin/" + a[0]; setTimeout(function(){ var b = $("#ck"); if (b) b.click(); }, 2500); return "opening the coin…"; });
route();
})();
