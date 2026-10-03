#!/usr/bin/env node
/*
 * Regression contract for the static trophy requirement system.
 *
 * Production API expected by this test:
 *   node tools/sync-trophy-cards.js --check
 * Canonical data expected at:
 *   data/trophy-requirements.json
 *
 * This test intentionally lands before that implementation (RED phase).
 */
'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TROPHY_DIR = path.join(ROOT, 'trophies');
const CATALOG = path.join(ROOT, 'data', 'trophy-requirements.json');
const SYNC = path.join(ROOT, 'tools', 'sync-trophy-cards.js');
const fixtureRoots = new Set();
process.on('exit', () => {
  for (const root of fixtureRoots) fs.rmSync(root, { recursive: true, force: true });
});
const OCTOBER = {
  'trophy-eternal-darkness-beatgame': 'Complete the game.',
  'trophy-eternal-darkness-silver': 'Complete the game in 2 alignments.',
  'trophy-eternal-darkness-gold': 'Complete the game in all alignments and unlock the secret epilogue.',
  'trophy-decap-attack-beatgame': 'Complete the game.',
  'trophy-decap-attack-silver': 'Collect both heart upgrades.',
  'trophy-decap-attack-gold': 'Complete Level 1 without losing a life.',
};
const EXPECTED_COUNTS = {
  'definition-detail': 60,
  'game-achievement-prose': 6,
  'game-shelf-plaque': 60,
  'index-full-plaque': 60,
  'profile-collection-plaque': 118,
  'profile-timeline-compact': 118,
  'profile-crown-jewel': 18,
  'profile-rarest-spotlight-summary': 18,
  'leaderboard-latest-text-link': 25,
  'ordinary-non-presentation-link': 18,
};
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function attrs(source) {
  const out = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = re.exec(source))) out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return out;
}

function parse(html) {
  const root = { tag: '#document', attrs: {}, children: [], parent: null };
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g;
  let match;
  while ((match = token.exec(html))) {
    const raw = match[0];
    if (raw[0] !== '<') {
      stack[stack.length - 1].children.push({ tag: '#text', text: raw, attrs: {}, children: [], parent: stack[stack.length - 1] });
      continue;
    }
    if (/^<!/.test(raw)) continue;
    const close = raw.match(/^<\/\s*([\w-]+)/);
    if (close) {
      const wanted = close[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === wanted) { stack.length = i; break; }
      }
      continue;
    }
    const open = raw.match(/^<\s*([\w-]+)([\s\S]*?)\/?\s*>$/);
    if (!open) continue;
    const node = { tag: open[1].toLowerCase(), attrs: attrs(open[2]), children: [], parent: stack[stack.length - 1] };
    node.parent.children.push(node);
    if (!VOID.has(node.tag) && !/\/>$/.test(raw)) stack.push(node);
  }
  return root;
}

function walk(node, result = []) {
  if (node.tag !== '#text') result.push(node);
  for (const child of node.children || []) walk(child, result);
  return result;
}
function classes(node) { return new Set((node.attrs.class || '').split(/\s+/).filter(Boolean)); }
function hasClass(node, name) { return classes(node).has(name); }
function text(node) {
  return (node.tag === '#text' ? node.text : (node.children || []).map(text).join(' ')).replace(/\s+/g, ' ').trim();
}
function descendants(node, predicate) { return walk(node, []).filter(n => n !== node && predicate(n)); }
function ancestor(node, predicate) { for (let n = node.parent; n; n = n.parent) if (predicate(n)) return n; return null; }
function trophyId(href = '') {
  const match = href.match(/(?:^|\/)(trophy-[a-z0-9-]+)\.html(?:[?#].*)?$/i);
  return match && match[1].toLowerCase();
}
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}
function normalized(value) { return value.replace(/\s+/g, ' ').trim(); }

function freshFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-trophy-card-fixture-'));
  fixtureRoots.add(fixture);
  const includedDirectories = new Set(['', 'data', 'games', 'trophies', 'users']);
  fs.cpSync(ROOT, fixture, {
    recursive: true,
    filter(source) {
      const rel = path.relative(ROOT, source);
      if (!rel) return true;
      const parts = rel.split(path.sep);
      if (parts.includes('.git') || parts.includes('images')) return false;
      if (fs.statSync(source).isDirectory()) return includedDirectories.has(rel);
      return source.endsWith('.html') || rel === 'styles.css' || rel === 'data/trophy-requirements.json';
    },
  });
  return fixture;
}

function fixtureFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? fixtureFiles(full) : [full];
  });
}

function snapshot(root) {
  return Object.fromEntries(fixtureFiles(root).sort().map(file => [path.relative(root, file), fs.readFileSync(file)]));
}

function assertSnapshot(root, before) {
  const after = snapshot(root);
  assert.deepStrictEqual(Object.keys(after), Object.keys(before), 'failed --check changed the fixture file set');
  for (const [file, content] of Object.entries(before)) assert.deepStrictEqual(after[file], content, `failed --check wrote ${file}`);
}

function runSync(root, mode) {
  return cp.execFileSync(process.execPath, [SYNC, mode, '--root', root], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
}

function expectRejected(label, mutate, outputPattern) {
  const fixture = freshFixture();
  mutate(fixture);
  const before = snapshot(fixture);
  assert.throws(() => runSync(fixture, '--check'), error => {
    assert.notStrictEqual(error.status, 0, `${label}: --check unexpectedly passed`);
    if (outputPattern) assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, outputPattern, `${label}: wrong failure reason`);
    return true;
  }, label);
  assertSnapshot(fixture, before);
}

const failures = [];
function check(label, fn) {
  try { fn(); console.log(`ok - ${label}`); }
  catch (error) { failures.push(`${label}: ${error.message}`); console.error(`not ok - ${label}\n  ${error.message}`); }
}

const definitionFiles = fs.readdirSync(TROPHY_DIR).filter(f => /^trophy-[a-z0-9-]+\.html$/.test(f)).sort();
const definitionIds = new Set(definitionFiles.map(f => f.slice(0, -5)));
const documents = htmlFiles(ROOT).map(file => ({ file, dom: parse(fs.readFileSync(file, 'utf8')) }));
const baselineRequirements = Object.fromEntries(documents
  .filter(d => path.relative(ROOT, d.file).startsWith('trophies/trophy-'))
  .map(d => {
    const id = path.basename(d.file, '.html');
    const prose = walk(d.dom).find(n => hasClass(n, 'tcase-plaque-text') && !descendants(n, x => x.tag === 'strong').length);
    return [id, prose ? normalized(text(prose)) : ''];
  }));

check('the baseline exposes exactly 60 trophy definitions', () => assert.strictEqual(definitionFiles.length, 60));

let catalog = null;
check('one canonical requirement catalog maps all 60 definition IDs', () => {
  assert.ok(fs.existsSync(CATALOG), 'missing data/trophy-requirements.json');
  catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  assert.deepStrictEqual(Object.keys(catalog).sort(), [...definitionIds].sort());
});

check('the deterministic static synchronizer has a clean --check mode', () => {
  assert.ok(fs.existsSync(SYNC), 'missing tools/sync-trophy-cards.js');
  cp.execFileSync(process.execPath, [SYNC, '--check'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
});

check('the six approved October requirements are exact', () => {
  const source = catalog || baselineRequirements;
  for (const [id, requirement] of Object.entries(OCTOBER)) assert.strictEqual(source[id], requirement, id);
});

check('all 60 requirements are polished sentence-case prose', () => {
  const source = catalog || baselineRequirements;
  assert.deepStrictEqual(Object.keys(source).sort(), [...definitionIds].sort());
  for (const [id, requirement] of Object.entries(source)) {
    assert.match(requirement, /^[A-Z0-9]/, `${id} starts with rough lowercase copy`);
    assert.match(requirement, /[.!?]$/, `${id} lacks terminal punctuation`);
    assert.ok(!/\s{2,}/.test(requirement), `${id} contains repeated whitespace`);
  }
});

check('every discovered trophy presentation has an always-visible canonical CHALLENGE plate', () => {
  const source = catalog || baselineRequirements;
  const counts = Object.fromEntries(Object.keys(EXPECTED_COUNTS).map(key => [key, 0]));
  for (const { file, dom } of documents) {
    const rel = path.relative(ROOT, file);
    const nodes = walk(dom);
    const candidates = [];
    if (rel.startsWith('trophies/')) candidates.push({ type: 'definition-detail', node: nodes.find(n => hasClass(n, 'tcase-glass')), id: path.basename(file, '.html') });
    for (const anchor of nodes.filter(n => n.tag === 'a' && trophyId(n.attrs.href))) {
      const id = trophyId(anchor.attrs.href);
      if (!definitionIds.has(id)) continue;
      let type;
      let container = anchor;
      if (hasClass(anchor, 'trophy-plaque')) type = rel === 'trophy-challenges.html' ? 'index-full-plaque' : rel.startsWith('games/') ? 'game-shelf-plaque' : rel.startsWith('users/') ? 'profile-collection-plaque' : null;
      else if (hasClass(anchor, 'timeline-entry')) type = 'profile-timeline-compact';
      else if (hasClass(anchor, 'crown-jewel-stage')) { type = 'profile-crown-jewel'; container = ancestor(anchor, n => hasClass(n, 'crown-jewel')); }
      else if (ancestor(anchor, n => hasClass(n, 'latest-col'))) type = 'leaderboard-latest-text-link';
      else if (rel.startsWith('games/') && descendants(anchor, n => n.tag === 'img').length) type = 'ordinary-non-presentation-link';
      else throw new Error(`${rel}: unknown trophy-bearing link/card type for ${id}`);
      candidates.push({ type, node: container, id });
    }
    for (const spotlight of nodes.filter(n => hasClass(n, 'spotlight-card') && /Rarest Trophy/i.test(text(n)))) {
      const crown = nodes.find(n => hasClass(n, 'crown-jewel-stage'));
      const inferred = crown && trophyId(crown.attrs.href);
      candidates.push({ type: 'profile-rarest-spotlight-summary', node: spotlight, id: spotlight.attrs['data-trophy-id'] || inferred, explicitId: spotlight.attrs['data-trophy-id'] });
    }
    for (const prose of nodes.filter(n => n.tag === 'li' && n.attrs['data-trophy-id'] && ancestor(n, x => x.attrs.id === 'section-achievements') && descendants(n, x => hasClass(x, 'trophy-requirement')).length)) {
      candidates.push({ type: 'game-achievement-prose', node: prose, id: prose.attrs['data-trophy-id'] });
    }
    for (const item of candidates) {
      assert.ok(Object.hasOwn(EXPECTED_COUNTS, item.type), `${rel}: unhandled trophy presentation type ${item.type}`);
      counts[item.type]++;
      assert.ok(item.node, `${rel}: ${item.type} has no containing element`);
      assert.ok(item.id && definitionIds.has(item.id), `${rel}: ${item.type} has no valid trophy target ID`);
      if (item.type === 'profile-rarest-spotlight-summary') assert.strictEqual(item.explicitId, item.id, `${rel}: rarest spotlight needs explicit data-trophy-id`);
      if (item.type === 'leaderboard-latest-text-link' || item.type === 'ordinary-non-presentation-link' || item.type === 'game-achievement-prose') {
        assert.strictEqual(descendants(item.node, n => hasClass(n, 'trophy-challenge-plate')).length, 0, `${rel}: ${item.type} must stay text/image-only`);
        continue;
      }
      const plates = descendants(item.node, n => hasClass(n, 'trophy-challenge-plate'));
      assert.strictEqual(plates.length, 1, `${rel}: ${item.type}/${item.id} needs one embedded challenge plate`);
      const label = descendants(plates[0], n => hasClass(n, 'trophy-challenge-label'))[0];
      const copy = descendants(plates[0], n => hasClass(n, 'trophy-challenge-requirement'))[0];
      assert.strictEqual(text(label), 'CHALLENGE', `${rel}: ${item.id} label`);
      assert.strictEqual(normalized(text(copy)), source[item.id], `${rel}: ${item.id} differs from canonical requirement`);
    }
  }
  assert.deepStrictEqual(counts, EXPECTED_COUNTS, 'presentation inventory drifted from the approved 501-representation baseline');
});

check('game achievement prose and detail prose equal the canonical requirement', () => {
  const source = catalog || baselineRequirements;
  let gameProseCount = 0;
  for (const { file, dom } of documents) {
    const rel = path.relative(ROOT, file);
    for (const node of walk(dom).filter(n => n.tag === 'li' && ancestor(n, x => x.attrs.id === 'section-achievements') && descendants(n, x => x.tag === 'strong').length)) {
      const section = ancestor(node, x => x.attrs.id === 'section-achievements');
      const proseItems = descendants(section, x => x.tag === 'li' && descendants(x, y => y.tag === 'strong').length);
      const plaques = descendants(section, x => x.tag === 'a' && hasClass(x, 'trophy-plaque') && trophyId(x.attrs.href));
      if (proseItems.length !== 3 || plaques.length !== 3) continue;
      const index = proseItems.indexOf(node);
      const inferred = trophyId(plaques[index].attrs.href);
      const id = node.attrs['data-trophy-id'] || inferred;
      assert.strictEqual(node.attrs['data-trophy-id'], inferred, `${rel}: game prose needs explicit matching data-trophy-id`);
      const strong = descendants(node, x => x.tag === 'strong')[0];
      const prose = normalized(text(node).slice(text(strong).length));
      assert.strictEqual(prose, source[id], `${rel}: ${id} structural game prose`);
      gameProseCount++;
    }
    for (const node of walk(dom).filter(n => n.attrs && n.attrs['data-trophy-id'])) {
      const id = node.attrs['data-trophy-id'];
      if (!definitionIds.has(id)) continue;
      const requirement = descendants(node, n => hasClass(n, 'trophy-requirement'))[0];
      if (requirement) assert.strictEqual(normalized(text(requirement)), source[id], `${rel}: ${id}`);
    }
  }
  assert.strictEqual(gameProseCount, 6, 'must structurally discover all six game objective prose items');
  for (const id of definitionIds) {
    const detail = documents.find(d => path.relative(ROOT, d.file) === `trophies/${id}.html`);
    const prose = walk(detail.dom).find(n => hasClass(n, 'tcase-plaque-text') && !descendants(n, x => x.tag === 'strong').length);
    assert.strictEqual(normalized(text(prose)), source[id], `trophies/${id}.html detail prose`);
  }
});

check('leaderboard latest trophy link names equal their trophy definition h1', () => {
  const leaderboard = documents.find(d => path.relative(ROOT, d.file) === 'leaderboards.html');
  assert.ok(leaderboard, 'missing leaderboards.html');
  const names = Object.fromEntries(documents
    .filter(d => path.relative(ROOT, d.file).startsWith('trophies/trophy-'))
    .map(d => [path.basename(d.file, '.html'), normalized(text(walk(d.dom).find(n => n.tag === 'h1')))]));
  for (const link of walk(leaderboard.dom).filter(n => n.tag === 'a' && trophyId(n.attrs.href) && ancestor(n, x => hasClass(x, 'latest-col')))) {
    const id = trophyId(link.attrs.href);
    const linkName = normalized(text(link)).replace(/\s*\([^)]*\)\s*$/, '');
    assert.strictEqual(linkName, names[id], id);
  }
});

check('trophy-room plaque names equal their detail headings', () => {
  const room = documents.find(d => path.relative(ROOT, d.file) === 'trophy-challenges.html').dom;
  const names = Object.fromEntries(documents
    .filter(d => path.relative(ROOT, d.file).startsWith('trophies/trophy-'))
    .map(d => [path.basename(d.file, '.html'), text(walk(d.dom).find(n => n.tag === 'h1'))]));
  for (const anchor of walk(room).filter(n => n.tag === 'a' && hasClass(n, 'trophy-plaque'))) {
    const id = trophyId(anchor.attrs.href);
    const heading = descendants(anchor, n => n.tag === 'h3')[0];
    assert.strictEqual(text(heading), names[id], `trophy-challenges.html: ${id}`);
  }
});

check('shortened Mega Man Legends trophy art alt uses the full established name', () => {
  for (const rel of ['trophy-challenges.html', 'games/2026-january-mega-man-legends.html']) {
    const dom = documents.find(d => path.relative(ROOT, d.file) === rel).dom;
    const anchor = walk(dom).find(n => n.tag === 'a' && trophyId(n.attrs.href) === 'trophy-mega-man-legends-minigamesscore');
    const image = descendants(anchor, n => n.tag === 'img')[0];
    assert.ok(image.attrs.alt.includes('High Score on All Mini Games'), `${rel}: shortened trophy alt text`);
  }
});

check('Kirby 64 beatgame metadata uses its established detail heading', () => {
  const detail = documents.find(d => path.relative(ROOT, d.file) === 'trophies/trophy-kirby-64-beatgame.html').dom;
  const heading = text(walk(detail).find(n => n.tag === 'h1'));
  const title = text(walk(detail).find(n => n.tag === 'title'));
  assert.ok(title.startsWith(`${heading} - Kirby 64:`), 'document title differs from h1');
  for (const key of ['og:title', 'twitter:title']) {
    const meta = walk(detail).find(n => n.tag === 'meta' && (n.attrs.property === key || n.attrs.name === key));
    assert.ok(meta.attrs.content.startsWith(`${heading} - Kirby 64:`), `${key} differs from h1`);
  }
});

check('Decap challenge window is public without private upgrade editorial notes', () => {
  const html = fs.readFileSync(path.join(ROOT, 'games', '2026-bonus-decap-attack.html'), 'utf8');
  assert.ok(html.includes('Three bonus challenges are open from October 1 through November 30, 2026.'));
  assert.ok(!html.includes('The club’s heart-upgrade requirement is reproduced as supplied; upgrade locations are not listed here.'));
});

check('crown jewel layout places art and info above a full-width requirement on desktop and mobile', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const rule = (source, selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = source.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
    assert.ok(found, `missing ${selector} CSS`);
    return found[1];
  };
  assert.match(rule(css, '.crown-jewel'), /display:\s*grid\s*;/, 'desktop card must use grid, not a three-column flex row');
  assert.match(rule(css, '.crown-jewel-stage'), /grid-row:\s*1\s*;/);
  assert.match(rule(css, '.crown-jewel-info'), /grid-row:\s*1\s*;/);
  const plate = rule(css, '.crown-jewel > .trophy-challenge-plate');
  assert.match(plate, /grid-column:\s*1\s*\/\s*-1\s*;/);
  assert.match(plate, /grid-row:\s*2\s*;/);
  const mobile = css.slice(css.indexOf('@media (max-width: 800px)'));
  assert.match(rule(mobile, '.crown-jewel'), /grid-template-columns:\s*1fr\s*;/);
  assert.match(rule(mobile, '.crown-jewel-info'), /grid-row:\s*2\s*;/);
  const compactPlate = css.match(/@media \(max-width: 800px\)\s*\{\s*\.crown-jewel > \.trophy-challenge-plate\s*\{([^}]+)\}/);
  assert.ok(compactPlate, 'missing mobile crown-jewel plate placement');
  assert.match(compactPlate[1], /grid-row:\s*3\s*;/);
});

const replaceOnce = (file, pattern, replacement) => {
  const source = fs.readFileSync(file, 'utf8');
  const changed = source.replace(pattern, replacement);
  assert.notStrictEqual(changed, source, `mutation did not match ${file}`);
  fs.writeFileSync(file, changed);
};

check('every game non-achievement list retains its immutable baseline copy', () => {
  const revision = 'e6ddc38b99ff605b890ab35cda82182397a733df';
  for (const { file, dom } of documents.filter(d => path.relative(ROOT, d.file).startsWith('games/'))) {
    const rel = path.relative(ROOT, file);
    const original = cp.execFileSync('git', ['show', `${revision}:${rel}`], { cwd: ROOT, encoding: 'utf8' });
    const outside = tree => walk(tree).filter(n => n.tag === 'li' && !ancestor(n, a => a.attrs.id === 'section-achievements'));
    const expected = outside(parse(original));
    const actual = outside(dom);
    assert.deepStrictEqual(actual.map(text), expected.map(text), `${rel}: non-achievement list copy changed`);
    for (const item of actual) {
      assert.ok(!item.attrs['data-trophy-id'], `${rel}: unrelated list item acquired a trophy ID`);
      assert.ok(!descendants(item, n => hasClass(n, 'trophy-requirement')).length, `${rel}: unrelated list item acquired trophy prose`);
    }
  }
});

check('write mode never converts strong-labelled trivia into trophy requirements', () => {
  const fixture = freshFixture();
  const file = path.join(fixture, 'games', '2026-bonus-decap-attack.html');
  const inserted = '<li><strong>Independent trivia:</strong> Preserve this unrelated fact.</li>';
  replaceOnce(file, '<ul class="trivia-list">', `<ul class="trivia-list">\n            ${inserted}`);
  runSync(fixture, '--write');
  assert.ok(fs.readFileSync(file, 'utf8').includes(inserted), '--write altered an unrelated strong-labelled item');
});

check('write mode preserves unrelated items inside the achievement list while refreshing ID-labelled prose', () => {
  const fixture = freshFixture();
  const file = path.join(fixture, 'games', '2026-bonus-decap-attack.html');
  const first = '<li><strong>Independent trivia:</strong> Preserve this unrelated fact.</li>';
  const middle = '<li><strong>Editorial aside:</strong> Keep this fact between trophies.</li>';
  replaceOnce(file, /(<div class="game-achievements" id="section-achievements">[\s\S]*?<ul class="trivia-list">)/,
    `$1\n            ${first}`);
  replaceOnce(file, /(<li data-trophy-id="trophy-decap-attack-beatgame">[\s\S]*?<\/li>)/,
    `$1\n            ${middle}`);
  const catalogFile = path.join(fixture, 'data', 'trophy-requirements.json');
  const definitions = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  definitions['trophy-decap-attack-silver'] = 'Collect both heart upgrades on the moon.';
  fs.writeFileSync(catalogFile, `${JSON.stringify(definitions, null, 2)}\n`);
  runSync(fixture, '--write');
  const written = fs.readFileSync(file, 'utf8');
  assert.ok(written.includes(first), '--write altered the unrelated item before the trophies');
  assert.ok(written.includes(middle), '--write altered the unrelated item between trophies');
  const section = walk(parse(written)).find(n => n.attrs.id === 'section-achievements');
  const prose = descendants(section, n => n.tag === 'li' && n.attrs['data-trophy-id']);
  assert.deepStrictEqual(prose.map(n => n.attrs['data-trophy-id']),
    ['trophy-decap-attack-beatgame', 'trophy-decap-attack-silver', 'trophy-decap-attack-gold']);
  assert.strictEqual(text(descendants(prose[1], n => hasClass(n, 'trophy-requirement'))[0]), definitions['trophy-decap-attack-silver']);
  assert.match(runSync(fixture, '--check'), /synchronized/i);
});

check('duplicate achievement prose IDs reject --write before any file changes', () => {
  const fixture = freshFixture();
  const file = path.join(fixture, 'games', '2026-bonus-decap-attack.html');
  replaceOnce(file, '<li data-trophy-id="trophy-decap-attack-gold">',
    '<li data-trophy-id="trophy-decap-attack-silver">');
  replaceOnce(path.join(fixture, 'games', '2025-april-billy-hatcher.html'),
    'Complete every level in Billy Hatcher and the Giant Egg.', 'Stale objective.');
  const before = snapshot(fixture);
  assert.throws(() => runSync(fixture, '--write'), error => {
    assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, /duplicate achievement prose ID/i);
    return true;
  });
  assertSnapshot(fixture, before);
});

check('missing identity in an existing achievement prose list rejects --write', () => {
  const fixture = freshFixture();
  replaceOnce(path.join(fixture, 'games', '2026-bonus-decap-attack.html'),
    '<li data-trophy-id="trophy-decap-attack-silver">', '<li>');
  const before = snapshot(fixture);
  assert.throws(() => runSync(fixture, '--write'), error => {
    assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, /achievement prose ID coverage/i);
    return true;
  });
  assertSnapshot(fixture, before);
});

check('unknown and foreign achievement prose IDs reject --write', () => {
  for (const [label, id] of [
    ['unknown', 'trophy-not-a-definition'],
    ['foreign', 'trophy-eternal-darkness-beatgame'],
  ]) {
    const fixture = freshFixture();
    replaceOnce(path.join(fixture, 'games', '2026-bonus-decap-attack.html'),
      '<li data-trophy-id="trophy-decap-attack-gold">', `<li data-trophy-id="${id}">`);
    const before = snapshot(fixture);
    assert.throws(() => runSync(fixture, '--write'), error => {
      assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, /unknown or foreign achievement prose ID/i, label);
      return true;
    });
    assertSnapshot(fixture, before);
  }
});

check('duplicate achievement plaque IDs reject --write', () => {
  const fixture = freshFixture();
  replaceOnce(path.join(fixture, 'games', '2026-bonus-decap-attack.html'),
    'href="../trophies/trophy-decap-attack-gold.html" class="trophy-plaque',
    'href="../trophies/trophy-decap-attack-silver.html" class="trophy-plaque');
  const before = snapshot(fixture);
  assert.throws(() => runSync(fixture, '--write'), error => {
    assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, /duplicate achievement plaque ID/i);
    return true;
  });
  assertSnapshot(fixture, before);
});

check('achievement prose rejects a missing section plaque before --write', () => {
  const fixture = freshFixture();
  replaceOnce(path.join(fixture, 'games', '2026-bonus-decap-attack.html'),
    /<a href="\.\.\/trophies\/trophy-decap-attack-gold\.html" class="trophy-plaque[^>]*>[\s\S]*?<\/a>/,
    '');
  const before = snapshot(fixture);
  assert.throws(() => runSync(fixture, '--write'), error => {
    assert.match(`${error.stdout || ''}\n${error.stderr || ''}`, /achievement prose.*plaque/i);
    return true;
  });
  assertSnapshot(fixture, before);
});

check('write mode refreshes existing achievement prose by trophy ID when catalog copy changes', () => {
  const fixture = freshFixture();
  const catalogFile = path.join(fixture, 'data', 'trophy-requirements.json');
  const definitions = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  definitions['trophy-decap-attack-silver'] = 'Collect both heart upgrades on the moon.';
  fs.writeFileSync(catalogFile, `${JSON.stringify(definitions, null, 2)}\n`);
  runSync(fixture, '--write');
  const game = parse(fs.readFileSync(path.join(fixture, 'games', '2026-bonus-decap-attack.html'), 'utf8'));
  const prose = walk(game).find(n => n.tag === 'li' && n.attrs['data-trophy-id'] === 'trophy-decap-attack-silver' && ancestor(n, a => a.attrs.id === 'section-achievements'));
  assert.strictEqual(text(descendants(prose, n => hasClass(n, 'trophy-requirement'))[0]), definitions['trophy-decap-attack-silver']);
  assert.match(runSync(fixture, '--check'), /synchronized/i);
});

check('each scratch fixture is unique, under the configured temp directory, and separately cleanable', () => {
  const first = freshFixture();
  const second = freshFixture();
  assert.notStrictEqual(first, second, 'fixtures must not share or delete a prior test directory');
  assert.ok(first.startsWith(`${os.tmpdir()}${path.sep}`) && second.startsWith(`${os.tmpdir()}${path.sep}`));
  assert.ok(fs.existsSync(first) && fs.existsSync(second));
});

const knownCard = path.join('trophy-challenges.html');
const knownId = 'trophy-eternal-darkness-beatgame';

check('catalog keys must exactly match trophy definition filenames', () => {
  expectRejected('catalog key missing', fixture => {
    const file = path.join(fixture, 'data', 'trophy-requirements.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete data[knownId];
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }, /catalog keys.*definition filenames/i);
  expectRejected('catalog key extra', fixture => {
    const file = path.join(fixture, 'data', 'trophy-requirements.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data['trophy-not-a-definition'] = 'Do the impossible.';
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }, /catalog keys.*definition filenames/i);
});

check('unknown new trophy-bearing visual anchor classes are rejected', () => {
  expectRejected('unknown trophy-bearing visual anchor class', fixture => replaceOnce(
    path.join(fixture, knownCard),
    '</main>',
    `  <a class="new-trophy-visual" href="trophies/${knownId}.html"><img alt="new trophy visual"></a>\n</main>`,
  ), /unknown trophy-bearing.*new-trophy-visual/i);
  expectRejected('unknown trophy ID', fixture => replaceOnce(
    path.join(fixture, knownCard),
    `href="trophies/${knownId}.html"`,
    'href="trophies/trophy-not-a-definition.html"',
  ), /unknown trophy ID trophy-not-a-definition/i);
});

check('real fixture mutations are rejected without writes and sync is idempotent', () => {
  assert.ok(fs.existsSync(SYNC), 'missing tools/sync-trophy-cards.js');
  expectRejected('stale copy', fixture => replaceOnce(path.join(fixture, knownCard), 'Complete the game.', 'Complete something else.'));
  expectRejected('missing plate', fixture => replaceOnce(path.join(fixture, knownCard), /\s*<div class="trophy-challenge-plate" data-trophy-id="trophy-eternal-darkness-beatgame">[\s\S]*?<\/div>/, ''));
  expectRejected('wrong detail objective', fixture => replaceOnce(path.join(fixture, 'trophies', `${knownId}.html`), '<p class="tcase-plaque-text">Complete the game.</p>', '<p class="tcase-plaque-text">Wrong objective.</p>'));

  const fixture = freshFixture();
  replaceOnce(path.join(fixture, knownCard), 'Complete the game.', 'Complete something else.');
  assert.match(runSync(fixture, '--write'), /1 files changed/i);
  assert.match(runSync(fixture, '--write'), /0 files changed/i);
  assert.match(runSync(fixture, '--check'), /synchronized/i);
});

check('challenge copy is static, fully wrappable, and not interaction-gated', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.trophy-challenge-plate\b/, 'missing challenge plate CSS');
  const rules = [...css.matchAll(/\.trophy-challenge[^{}]*\{([^}]*)\}/gs)].map(m => m[1]).join('\n');
  assert.ok(!/(?:display\s*:\s*none|visibility\s*:\s*hidden|white-space\s*:\s*nowrap|text-overflow\s*:\s*ellipsis|-webkit-line-clamp)/i.test(rules), 'challenge CSS hides or truncates copy');
  for (const { file } of documents) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!/<(?:script|template)[^>]*>(?:(?!<\/(?:script|template)>)[\s\S])*trophy-challenge-plate/gi.test(source), `${path.relative(ROOT, file)} injects challenge copy with JavaScript/template content`);
  }
});

if (failures.length) {
  console.error(`\nFAIL (${failures.length} regression groups)\n${failures.map(x => `- ${x}`).join('\n')}`);
  process.exit(1);
}
console.log('\nPASS - trophy cards and requirements are synchronized');
