#!/usr/bin/env node
/*
 * Retro Game Club — site invariant checker.
 *   Run from the repo root:  node tools/audit.js
 * Exit code 0 = clean, 1 = violations found. Add --quiet to only print failures.
 *
 * This enforces the drift-prone invariants documented in README.md
 * ("Consistency rules"). Run it before committing a monthly rollover.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const G = path.join(ROOT, 'games');
const T = path.join(ROOT, 'trophies');
const U = path.join(ROOT, 'users');
const DENOM = 27; // active members = rarity denominator. Bump here + in README when membership changes.

const QUIET = process.argv.includes('--quiet');
const read = p => fs.readFileSync(p, 'utf8');
const problems = [];
const fail = (cat, msg) => problems.push(`[${cat}] ${msg}`);

// Rarity tier by holder count (README "Consistency rules"): Legendary <=10% / Rare 11-20% / Uncommon 21-40% / Common >40%.
const tierOf = n => (n <= 2 ? 'Legendary' : n <= 5 ? 'Rare' : n <= 10 ? 'Uncommon' : 'Common');

const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
const htmlFiles = dir => fs.readdirSync(dir).filter(f => f.endsWith('.html'));

// Chronologically-ordered monthly game filenames (bonus games excluded).
const monthlyGames = htmlFiles(G)
  .filter(f => /^\d{4}-[a-z]+-/.test(f) && !/-bonus-/.test(f))
  .map(f => { const m = f.match(/^(\d{4})-([a-z]+)-/); return { f, key: (+m[1]) * 12 + (MONTHS[m[2]] ?? 99) }; })
  .sort((a, b) => a.key - b.key).map(x => x.f);
const newestGame = monthlyGames[monthlyGames.length - 1];

// ---------- 1. Member count / denominator ----------
const profiles = fs.readdirSync(U).filter(f => /^user-.*\.html$/.test(f));
if (profiles.length !== DENOM) fail('members', `${profiles.length} profile pages but DENOM is ${DENOM} — update DENOM + README when membership changes`);

// ---------- 2. Trophy rarity: tier label + class + stat format must match holder % ----------
const trophyFiles = htmlFiles(T);
for (const f of trophyFiles) {
  const h = read(path.join(T, f));
  if (/tcase-rarity-unclaimed/.test(h)) continue;           // 0-holder trophies are legitimately "Unclaimed"
  const nm = h.match(/(\d+) of 27/); if (!nm) continue;
  const n = +nm[1]; if (n === 0) continue;
  const pct = Math.round(n / DENOM * 100);
  const tier = tierOf(n);
  const lbl = (h.match(/tcase-rarity-label">([^<]*)</) || [])[1];
  const cls = (h.match(/tcase-rarity tcase-rarity-(\w+)"/) || [])[1];
  const stat = (h.match(/tcase-rarity-stat">([^<]*)</) || [])[1];
  if (lbl && lbl !== tier) fail('rarity-tier', `${f}: label "${lbl}" but ${n}/27 (${pct}%) => ${tier}`);
  if (cls && cls !== tier.toLowerCase()) fail('rarity-tier', `${f}: class tcase-rarity-${cls} but expected tcase-rarity-${tier.toLowerCase()}`);
  const want = `${n} of 27 members (${pct}%)`;
  if (stat && stat !== want) fail('rarity-fmt', `${f}: stat "${stat}" should be "${want}"`);
}

// ---------- 3. Profile "Rarity Breakdown" must equal the member's real trophy tiers ----------
const tally = {}; profiles.forEach(f => { tally[f.replace(/^user-|\.html$/g, '')] = { Legendary: 0, Rare: 0, Uncommon: 0, Common: 0 }; });
for (const f of trophyFiles) {
  const h = read(path.join(T, f));
  const tier = (h.match(/tcase-rarity-label">(Legendary|Rare|Uncommon|Common)</) || [])[1];
  if (!tier) continue;
  for (const u of new Set([...h.matchAll(/users\/user-(\w+)\.html/g)].map(m => m[1]))) if (tally[u]) tally[u][tier]++;
}
const ROW = { 'rarity-ultra': 'Legendary', 'rarity-rare': 'Rare', 'rarity-uncommon': 'Uncommon', 'rarity-common': 'Common' };
for (const f of profiles) {
  const h = read(path.join(U, f)); const u = f.replace(/^user-|\.html$/g, '');
  if (!/rarity-chart/.test(h)) continue;                    // minimal profiles have no breakdown panel
  if (/Ultra Rare/.test(h)) fail('breakdown', `${f}: uses legacy "Ultra Rare" label — should be "Legendary"`);
  for (const [cls, tier] of Object.entries(ROW)) {
    const m = h.match(new RegExp(`rarity-bar-fill ${cls}"[^>]*></div>\\s*</div>\\s*<span class="rarity-count">(\\d+)</span>`));
    if (m && +m[1] !== tally[u][tier]) fail('breakdown', `${f}: ${tier} shows ${m[1]} but member holds ${tally[u][tier]}`);
  }
}

// ---------- 4. Game-page nav: every dropdown lists all monthly games; no stale "Latest" ----------
for (const f of monthlyGames) {
  const h = read(path.join(G, f));
  for (const g of monthlyGames) if (!h.includes(`value="${g}"`)) fail('nav', `${f}: dropdown missing option for ${g}`);
  for (const m of h.matchAll(/href="([^"]+)" class="game-nav-link nav-last"/g)) {
    if (m[1] !== newestGame) fail('nav', `${f}: "Latest" link -> ${m[1]} (should be ${newestGame})`);
  }
}

// ---------- 5. Missing images / broken internal links (src + href) ----------
const allHtml = [
  ...htmlFiles(ROOT).map(f => path.join(ROOT, f)),
  ...monthlyGames.map(f => path.join(G, f)),
  ...htmlFiles(G).filter(f => /-bonus-/.test(f)).map(f => path.join(G, f)),
  ...trophyFiles.map(f => path.join(T, f)),
  ...profiles.map(f => path.join(U, f)),
];
for (const fp of allHtml) {
  const h = read(fp).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''); // ignore inline JS/CSS
  for (const m of h.matchAll(/(?:src|href)="([^"]+)"/g)) {
    let ref = m[1];
    if (/^(https?:|mailto:|data:|#|\/\/)/.test(ref)) continue;   // external / anchor
    ref = ref.split('#')[0].split('?')[0]; if (!ref) continue;
    const target = path.resolve(path.dirname(fp), ref);
    if (!fs.existsSync(target)) fail('missing-file', `${path.relative(ROOT, fp)} -> ${m[1]} (not on disk)`);
  }
}

// ---------- report ----------
const cats = [...new Set(problems.map(p => p.match(/^\[([^\]]+)\]/)[1]))];
if (problems.length === 0) {
  console.log(`✓ RGC audit clean — ${monthlyGames.length} monthly games, ${trophyFiles.length} trophies, ${profiles.length} members, all invariants hold.`);
  process.exit(0);
}
if (!QUIET) console.log(`RGC audit: ${problems.length} violation(s) across ${cats.length} categor(y/ies)\n`);
for (const p of problems) console.log('  ' + p);
console.log(`\nFAIL (${problems.length}). Fix the above or update tools/audit.js + README if an invariant intentionally changed.`);
process.exit(1);
