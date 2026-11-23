# heir

a dead dev switch for pump.fun coins. the dev checks in every 72 hours with one signature. miss one and the creator fees pass to the top 50 holders, split by bag, forever.

- `/`: the landing, with the switch you can drag, the steps, the split calculator, a terminal and the live coins
- `/app`: the board, each coin's page (its pulse, vault, heirs, ledger and check-ins) and the add flow
- `/docs`: HEIR(7), the manual
- `/api/heir?action=…`: one endpoint: `config`, `coins`, `coin`, `verify`, `tx`, `pay` (POST), `sweep` (daily cron)

## environment (set these in Vercel → Settings → Environment Variables)

| name | required | what it is |
|---|---|---|
| `HEIR_SEED` | yes | a long random secret. every coin's vault key is derived from it and the mint. **keep it secret and never change it**: a new secret means new vaults. |
| `RPC_URL` | yes | a Solana mainnet RPC that allows `getProgramAccounts` (Helius, Triton…). the public one rate-limits hard. |
| `HEIR_TAG` | no | the tag address notes are sent to. by default it's derived from `HEIR_SEED`. |

until `HEIR_SEED` is set the site shows honest empty states ("—") and adding coins is off.

## how it works

- register and check-in are memo notes (`heir:1:register:<mint>`, `heir:1:checkin:<mint>`) signed by the coin's creator wallet, sent with a 0-SOL transfer to the tag address. the registry is rebuilt from that address's history.
- the creator is read from the coin's pump.fun bonding curve account.
- the switch fires 72h after the last check-in and never resets.
- vault payouts: to the dev while alive (≥ ◎0.01), to the top 50 holders by bag after it fires (≥ ◎0.02). pools, program accounts (off-curve owners), the dev and the vault never inherit. cuts under ◎0.001 drop.

## tests

`node test/sol.test.js` · `node test/api.test.js` · `node test/site.js` (playwright, mock chain) · `PORT=4420 node test/server.js` to run it locally.
