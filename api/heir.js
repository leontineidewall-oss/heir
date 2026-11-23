// one endpoint, many actions: /api/heir?action=config|coins|coin|verify|tx|pay|sweep
const L = require("./_lib"), S = require("./_sol");
function send(res, code, body, age){ res.statusCode = code; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", age ? "public, s-maxage=" + age + ", stale-while-revalidate=" + age * 3 : "no-store"); res.end(JSON.stringify(body)); }
const q = (req, k) => { const u = new URL(req.url, "http://x"); return (u.searchParams.get(k) || "").trim(); };
const pub = c => ({ mint: c.mint, dev: c.dev, registered: c.registered, last: c.last, beats: c.beats.length, state: c.state, firedAt: c.firedAt, deadline: c.deadline, vault: c.vault });
async function withMeta(list){
  const m = list.length ? await L.meta(list.map(c => c.mint)) : {};
  const b = list.length && L.cfg().seed ? await L.balances(list.map(c => c.vault)) : {};
  return list.map(c => Object.assign(pub(c), m[c.mint] || {}, { bal: b[c.vault] != null ? b[c.vault] / L.LAMPORTS : null }));
}
const A = {
  async config(){ const c = L.cfg(); return [200, { live: c.live, tag: c.tag, hours: L.HOURS, heirs: L.HEIRS, minCut: L.MIN_CUT / L.LAMPORTS, reserve: L.RESERVE / L.LAMPORTS, sol: await L.sol(), t: Date.now() }, 30]; },
  async coins(req){
    if (!L.cfg().live) return [200, { live: false, coins: [], counts: { coins: 0, alive: 0, fired: 0, vaults: 0 } }, 20];
    const list = await withMeta(await L.registry(q(req, "fresh") === "1"));
    const counts = { coins: list.length, alive: list.filter(c => c.state === "alive").length, fired: list.filter(c => c.state === "fired").length, vaults: list.reduce((s, c) => s + (c.bal || 0), 0) };
    return [200, { live: true, t: Date.now(), coins: list, counts }, 15];
  },
  async coin(req){
    const mint = q(req, "mint"); if (!S.isAddr(mint)) return [400, { error: "that isn't a Solana address" }];
    const reg = await L.registry(q(req, "fresh") === "1"), c = reg.find(x => x.mint === mint);
    if (!c) return [200, { error: "this coin isn't on heir", notOnHeir: true }, 5];
    const [one] = await withMeta([c]);
    let heirs = null, herr = null; try { heirs = await L.heirs(mint, [c.dev, c.vault]); } catch (e) { herr = e.message; }
    let ledger = []; try {
      const sigs = await L.rpc("getSignaturesForAddress", [c.vault, { limit: 25 }]);
      const txs = await L.pool(sigs, 6, s => L.rpc("getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 0 }]));
      ledger = txs.map((t, i) => { if (!t || t.error || !t.meta) return null; const keys = t.transaction.message.accountKeys, vi = keys.indexOf(c.vault); if (vi < 0) return null;
        const d = (t.meta.postBalances[vi] - t.meta.preBalances[vi]) / L.LAMPORTS; return { t: (t.blockTime || 0) * 1000, sig: sigs[i].signature, d, n: d < 0 ? Math.max(1, keys.length - 2) : 0, err: !!t.meta.err }; }).filter(Boolean);
    } catch (e) {}
    const payable = one.bal != null ? Math.max(0, one.bal - L.RESERVE / L.LAMPORTS) : null;
    const preview = heirs && payable ? L.split(heirs.top, Math.floor(payable * L.LAMPORTS)).map(x => ({ w: x.w, share: x.share, ofSupply: x.ofSupply, cut: x.lamports / L.LAMPORTS })) : null;
    return [200, Object.assign(one, { checkins: c.beats.map(b => ({ t: b.t, sig: b.sig })), heirs: heirs ? heirs.top.map(x => ({ w: x.w, share: x.share, ofSupply: x.ofSupply })) : null, holders: heirs ? heirs.holders : null, topShare: heirs ? heirs.topShare : null, heirsError: herr, preview, ledger, t: Date.now() }), 10];
  },
  async verify(req){
    const mint = q(req, "mint"), wallet = q(req, "wallet");
    if (!S.isAddr(mint)) return [400, { error: "paste a coin's contract address" }];
    if (!L.cfg().live) return [503, { error: "heir is not live yet" }];
    const [cr, reg, m] = await Promise.all([L.creatorOf(mint), L.registry(true), L.meta([mint])]);
    if (!cr.pump) return [200, { mint, pump: false, error: "that isn't a pump.fun coin" }];
    const on = reg.find(x => x.mint === mint);
    return [200, Object.assign({ mint, pump: true, creator: cr.creator, graduated: cr.complete, onHeir: !!on, state: on ? on.state : null, vault: L.vault(mint).pub, isCreator: !!wallet && wallet === cr.creator }, m[mint] || {})];
  },
  // an unsigned note for the dev's wallet to sign: register or check in
  async tx(req){
    const kind = q(req, "kind"), mint = q(req, "mint"), wallet = q(req, "wallet"), c = L.cfg();
    if (!c.live) return [503, { error: "heir is not live yet" }];
    if (!["register", "checkin"].includes(kind) || !S.isAddr(mint) || !S.isAddr(wallet)) return [400, { error: "bad request" }];
    const reg = await L.registry(true), on = reg.find(x => x.mint === mint);
    if (kind === "register") { if (on) return [409, { error: "this coin is already on heir" }]; const cr = await L.creatorOf(mint); if (!cr.pump) return [400, { error: "that isn't a pump.fun coin" }]; if (cr.creator !== wallet) return [403, { error: "only the coin's creator wallet can add it" }]; }
    else { if (!on) return [404, { error: "this coin isn't on heir" }]; if (on.dev !== wallet) return [403, { error: "only the dev wallet can check in" }]; if (on.state === "fired") return [409, { error: "the switch already fired. check-ins don't count anymore" }]; }
    const bh = await L.rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
    const { msg, nSig } = S.message(wallet, [S.transfer(wallet, c.tag, 0), S.memo(L.TAG_PREFIX + kind + ":" + mint)], bh.value.blockhash);
    return [200, { tx: S.b58e(S.tx(msg, nSig)), note: L.TAG_PREFIX + kind + ":" + mint }];
  },
  async pay(req){ if (req.method !== "POST") return [405, { error: "POST" }]; const mint = q(req, "mint"); if (!S.isAddr(mint)) return [400, { error: "bad mint" }];
    try { return [200, await L.payout(mint)]; } catch (e) { return [409, { error: e.message }]; } },
  // daily: pay every fired vault that has enough in it
  async sweep(){ const reg = (await L.registry(true)).filter(c => c.state === "fired"), out = [], t0 = Date.now();
    for (const c of reg) { if (Date.now() - t0 > 45000) break; try { out.push(Object.assign({ mint: c.mint }, await L.payout(c.mint))); } catch (e) { out.push({ mint: c.mint, skip: e.message }); } }
    return [200, { ran: out }]; },
};
module.exports = async (req, res) => {
  const a = A[q(req, "action")]; if (!a) return send(res, 400, { error: "unknown action" });
  try { const [code, body, age] = await a(req); send(res, code, body, code === 200 ? age : 0); }
  catch (e) { send(res, 502, { error: (e && e.message) || "unavailable right now" }); }
};
