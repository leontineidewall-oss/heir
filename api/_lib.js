// heir core: config, rpc, the on-chain registry, vaults, heirs and payouts
const S = require("./_sol");
const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", TOKEN22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const HOURS = 72, HEIRS = 50, MIN_CUT = 1000000, RESERVE = 1000000, FEE = 5000, PER_TX = 18, LAMPORTS = 1e9;
const TAG_PREFIX = "heir:1:";
function cfg(){
  const seed = process.env.HEIR_SEED || "";
  const tag = process.env.HEIR_TAG || (seed ? S.keypair(S.sha("heir:v1:tag:" + seed)).pub : null);
  return { seed, tag, rpc: process.env.RPC_URL || "https://solana-rpc.publicnode.com", live: !!(seed && tag) };
}
function vault(mint){ const c = cfg(); if (!c.seed) throw new Error("heir is not live yet"); return S.keypair(S.sha("heir:v1:vault:" + c.seed + ":" + mint)); }
async function get(url, ms){ const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 8000);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } }); if (!r.ok) throw new Error("http " + r.status); return await r.json(); } finally { clearTimeout(to); } }
let rid = 0;
async function rpc(method, params, tries){
  const c = cfg(); let last;
  for (let i = 0; i < (tries || 3); i++) {
    try { const r = await fetch(c.rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++rid, method, params }) });
      if (r.status === 429 || r.status >= 500) throw new Error("rpc busy");
      const j = await r.json(); if (j.error) { const e = new Error(j.error.message || "rpc error"); e.rpc = 1; throw e; } return j.result;
    } catch (e) { last = e; if (e.rpc) throw e; await new Promise(r => setTimeout(r, 300 * (i + 1))); }
  }
  throw last;
}
// several calls at once, a few in flight
async function pool(items, n, fn){ const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = { error: e.message }; } } }));
  return out; }
async function sol(){ try { const j = await get("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", 5000); const v = j && j.So11111111111111111111111111111111111111112; if (v && v.usdPrice) return +v.usdPrice; } catch (e) {}
  try { const j = await get("https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112", 5000); const p = (j || []).find(x => x.quoteToken && /USD/.test(x.quoteToken.symbol)); if (p) return +p.priceUsd; } catch (e) {} return null; }
// pump.fun: the bonding curve account names the coin's creator
async function creatorOf(mint){
  const bc = S.pda([Buffer.from("bonding-curve"), S.key(mint)], PUMP);
  const a = await rpc("getAccountInfo", [bc, { encoding: "base64" }]);
  if (!a || !a.value || a.value.owner !== PUMP) return { pump: false, curve: bc };
  const d = Buffer.from(a.value.data[0], "base64");
  return { pump: true, curve: bc, complete: d.length > 48 ? d[48] === 1 : null, creator: d.length >= 81 ? S.b58e(d.subarray(49, 81)) : null };
}
async function meta(mints){
  const out = {}; for (let i = 0; i < mints.length; i += 30) {
    try { const j = await get("https://api.dexscreener.com/tokens/v1/solana/" + mints.slice(i, i + 30).join(","), 7000);
      (j || []).forEach(p => { const m = p.baseToken && p.baseToken.address; if (!m || (out[m] && (out[m].liq || 0) > ((p.liquidity && p.liquidity.usd) || 0))) return;
        out[m] = { sym: p.baseToken.symbol, name: p.baseToken.name, img: (p.info && p.info.imageUrl) || null, mcap: p.marketCap || p.fdv || null, price: +p.priceUsd || null, liq: (p.liquidity && p.liquidity.usd) || 0, url: p.url, dex: p.dexId }; });
    } catch (e) {} }
  return out;
}
// the registry is the chain: notes sent to the tag address
let REG = { t: 0, list: null };
function parseMemo(logs){ for (const l of logs || []) { const m = /Memo \(len \d+\): "(.*)"$/.exec(l); if (m) return m[1].replace(/\\"/g, '"'); } return null; }
async function registry(fresh){
  if (!fresh && REG.list && Date.now() - REG.t < 20000) return REG.list;
  const c = cfg(); if (!c.live) return [];
  let sigs = [], before; for (let p = 0; p < 5; p++) { const r = await rpc("getSignaturesForAddress", [c.tag, Object.assign({ limit: 1000 }, before ? { before } : {})]); sigs = sigs.concat(r); if (r.length < 1000) break; before = r[r.length - 1].signature; }
  sigs = sigs.filter(s => !s.err && s.memo && s.memo.indexOf(TAG_PREFIX) >= 0);
  const txs = await pool(sigs, 8, s => rpc("getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]));
  const ev = [];
  txs.forEach((t, i) => { if (!t || t.error || !t.meta || t.meta.err) return; const text = parseMemo(t.meta.logMessages); if (!text || text.indexOf(TAG_PREFIX) !== 0) return;
    const [, , kind, mint] = text.split(":"); if (!S.isAddr(mint || "")) return;
    ev.push({ kind, mint, by: t.transaction.message.accountKeys[0], t: (t.blockTime || sigs[i].blockTime) * 1000, sig: sigs[i].signature }); });
  ev.sort((a, b) => a.t - b.t);
  const coins = new Map();
  for (const e of ev) {
    if (e.kind === "register" && !coins.has(e.mint)) coins.set(e.mint, { mint: e.mint, dev: e.by, registered: e.t, regSig: e.sig, beats: [{ t: e.t, sig: e.sig }] });
    else if (e.kind === "checkin" && coins.has(e.mint)) { const c = coins.get(e.mint); if (e.by === c.dev) c.beats.push({ t: e.t, sig: e.sig }); }
  }
  const list = [...coins.values()].map(state);
  REG = { t: Date.now(), list }; return list;
}
// alive until one gap between beats runs past 72h; after that it's fired for good
function state(c, now){
  now = now || Date.now(); const win = HOURS * 3600e3; let firedAt = null;
  for (let i = 1; i < c.beats.length; i++) if (c.beats[i].t - c.beats[i - 1].t > win) { firedAt = c.beats[i - 1].t + win; break; }
  let beats = c.beats; if (firedAt) beats = beats.filter(b => b.t <= firedAt);
  const last = beats[beats.length - 1].t;
  if (!firedAt && now - last > win) firedAt = last + win;
  return Object.assign({}, c, { beats, last, state: firedAt ? "fired" : "alive", firedAt, deadline: firedAt ? null : last + win, vault: cfg().seed ? vault(c.mint).pub : null });
}
async function balances(addrs){ const out = {}; for (let i = 0; i < addrs.length; i += 100) { const r = await rpc("getMultipleAccounts", [addrs.slice(i, i + 100), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]); r.value.forEach((a, j) => { out[addrs[i + j]] = a ? a.lamports : 0; }); } return out; }
// the top 50 wallets by bag; pools, program accounts, the dev and the vault never inherit
async function heirs(mint, skip){
  const mi = await rpc("getAccountInfo", [mint, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  if (!mi || !mi.value) throw new Error("mint not found");
  const prog = mi.value.owner === TOKEN22 ? TOKEN22 : TOKEN;
  const filters = [{ memcmp: { offset: 0, bytes: mint } }]; if (prog === TOKEN) filters.unshift({ dataSize: 165 });
  const accs = await rpc("getProgramAccounts", [prog, { encoding: "base64", filters, dataSlice: { offset: 32, length: 40 } }], 2);
  const by = new Map();
  for (const a of accs) { const d = Buffer.from(a.account.data[0], "base64"); if (d.length < 40) continue; const amt = d.readBigUInt64LE(32); if (amt === 0n) continue; const owner = S.b58e(d.subarray(0, 32)); by.set(owner, (by.get(owner) || 0n) + amt); }
  const sk = new Set(skip || []); let supply = 0n; for (const v of by.values()) supply += v;
  const list = [...by.entries()].filter(([o]) => !sk.has(o) && S.onCurve(S.key(o))).sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0)).slice(0, HEIRS);
  const top = list.reduce((s, x) => s + x[1], 0n);
  return { holders: by.size, top: list.map(([w, amt]) => ({ w, amt: amt.toString(), share: top ? Number(amt * 1000000n / top) / 1e6 : 0, ofSupply: supply ? Number(amt * 1000000n / supply) / 1e6 : 0 })), topShare: supply ? Number(top * 1000000n / supply) / 1e6 : 0 };
}
// split the payable SOL by bag; cuts under the minimum drop and their share goes back to the rest
function split(list, payable){
  let rows = list.map(x => Object.assign({}, x)); for (let r = 0; r < 60; r++) {
    const tot = rows.reduce((s, x) => s + x.share, 0); if (!tot) return [];
    rows.forEach(x => { x.lamports = Math.floor(payable * x.share / tot); });
    const keep = rows.filter(x => x.lamports >= MIN_CUT); if (keep.length === rows.length) return rows; rows = keep; }
  return rows;
}
async function send(priv, payer, ixs){
  const bh = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const { msg, nSig } = S.message(payer, ixs, bh.value.blockhash);
  const raw = S.tx(msg, nSig, [S.sign(priv, msg)]);
  return rpc("sendTransaction", [raw.toString("base64"), { encoding: "base64", preflightCommitment: "confirmed", maxRetries: 3 }], 1);
}
const LOCK = new Map();
async function lock(mint, fn){ if (LOCK.has(mint) && Date.now() - LOCK.get(mint) < 90000) throw new Error("a payout for this coin is already running"); LOCK.set(mint, Date.now()); try { return await fn(); } finally { LOCK.delete(mint); } }
// pay the vault out: to the dev while the coin is alive, to the 50 heirs once the switch has fired
async function payout(mint){
  const list = await registry(true), c = list.find(x => x.mint === mint); if (!c) throw new Error("not an heir coin");
  return lock(mint, async () => {
    const v = vault(mint), bal = (await rpc("getBalance", [v.pub, { commitment: "confirmed" }])).value;
    if (c.state === "alive") {
      const amt = bal - RESERVE - FEE; if (amt < 10000000) throw new Error("under ◎0.01 in the vault, nothing to collect");
      const sig = await send(v.priv, v.pub, [S.transfer(v.pub, c.dev, amt)]);
      return { to: "dev", sent: amt / LAMPORTS, sigs: [sig] };
    }
    const h = await heirs(mint, [c.dev, v.pub]); if (!h.top.length) throw new Error("no heirs found");
    const batches = Math.ceil(h.top.length / PER_TX), payable = bal - RESERVE - FEE * batches;
    if (payable < 20000000) throw new Error("under ◎0.02 in the vault, nothing to pay yet");
    const rows = split(h.top, payable), sigs = [];
    for (let i = 0; i < rows.length; i += PER_TX) { const part = rows.slice(i, i + PER_TX); sigs.push(await send(v.priv, v.pub, part.map(x => S.transfer(v.pub, x.w, x.lamports)))); }
    return { to: "heirs", wallets: rows.length, sent: rows.reduce((s, x) => s + x.lamports, 0) / LAMPORTS, sigs };
  });
}
module.exports = { cfg, vault, rpc, get, pool, sol, creatorOf, meta, registry, state, balances, heirs, split, payout, HOURS, HEIRS, MIN_CUT, RESERVE, LAMPORTS, TAG_PREFIX, PUMP };
