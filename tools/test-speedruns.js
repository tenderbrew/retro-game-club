#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { auditGames, validateGameHtml } = require('./audit-speedruns');

const section = ({ category = 'Any%', time = '54:08', runner = 'Runner_1', verified = false, date = '2026-10-03', href = 'https://www.speedrun.com/game-name/runs/abc-123' } = {}) => `
<div class="game-speedruns" id="section-speedruns"${verified ? ' data-speedrun-verified="true"' : ''}>
  <h2>Speedrun Records</h2>
  ${verified && date !== null ? `<time class="speedrun-checked" datetime="${date}">Checked October 3, 2026</time>` : ''}
  <div class="speedrun-grid"><div class="speedrun-card">
    <span class="speedrun-category">${category}</span>
    <span class="speedrun-time">${time}</span>
    <span class="speedrun-runner">${runner}</span>
    ${verified && href !== null ? `<div><a class="speedrun-run-link" href="${href}" target="_blank" rel="noopener noreferrer">View verified run</a></div>` : ''}
  </div></div>
</div>`;

const ok = html => assert.deepStrictEqual(validateGameHtml(html, '2026-october-test.html'), []);
const bad = (html, fragment, filename = '2026-october-test.html') =>
  assert(validateGameHtml(html, filename).some(e => e.includes(fragment)), `expected ${fragment}`);

ok(section());
ok(section({ verified: true }));
ok(section({ verified: true }).replace('View verified run</a>', 'View verified run &rarr;</a>'));
ok(section({ verified: true }).replace('Checked October 3, 2026</time>', 'Checked October 3, 2026 &rarr;</time>').replace('View verified run</a>', 'View verified run &rarr;</a>'));
bad(section({ verified: true }).replace('View verified run</a>', '</a>'), 'direct speedrun.com run link');
for (const time of ['2:28.79', '6.26s', '54:08', '1:23:26']) ok(section({ time }));
bad('<p>unrelated <span class="speedrun-runner">Runner</span></p>', 'missing #section-speedruns');
// Raw text and inert template content cannot stand in for rendered records.
bad(`<script type="text/plain">${section({ verified: true })}</script>`, 'missing #section-speedruns');
bad(`<style>${section({ verified: true })}</style>`, 'missing #section-speedruns');
bad(`<template>${section({ verified: true })}</template>`, 'missing #section-speedruns');
ok(`<script>const fake = '</div>'; const markup = ${JSON.stringify(section({ verified: true, date: null }))};</script>${section({ verified: true })}`);
ok(`<template><script>const fake = '</template><div>'; </script>${section({ verified: true, date: null })}</template>${section({ verified: true })}`);
ok(`<style>${section({ verified: true, date: null })}</style>${section({ verified: true })}`);
bad(`<div hidden><script>const fakeClose = '</div>'; </script>${section({ verified: true })}</div>`, 'missing #section-speedruns');
// A required node or its ancestor must actually be visible in the markup.
bad(section({ verified: true }).replace('class="game-speedruns"', 'hidden class="game-speedruns"'), 'missing #section-speedruns');
bad(`<div style="DISPLAY : none">${section({ verified: true })}</div>`, 'missing #section-speedruns');
ok(`${section({ verified: true }).replace('class="game-speedruns"', 'hidden class="game-speedruns"')}${section({ verified: true })}`);
bad(section().replace('class="speedrun-card"', 'hidden class="speedrun-card"'), 'no .speedrun-card');
bad(section().replace('class="speedrun-grid"', 'class="speedrun-grid" style="visibility : HIDDEN"'), 'no .speedrun-card');
bad(section().replace('class="speedrun-category"', 'hidden class="speedrun-category"'), 'nonempty .speedrun-category');
bad(section().replace('class="speedrun-time"', 'class="speedrun-time" style="display: none"'), 'invalid exact .speedrun-time');
bad(section().replace('class="speedrun-runner"', 'class="speedrun-runner" style="visibility:hidden"'), 'identifiable .speedrun-runner');
bad(section().replace('>Any%</span>', '><span hidden>Any%</span></span>'), 'nonempty .speedrun-category');
bad(section().replace('>Any%</span>', '><template>Any%</template></span>'), 'nonempty .speedrun-category');
bad(section({ verified: true }).replace('class="speedrun-checked"', 'hidden class="speedrun-checked"'), '.speedrun-checked');
bad(section({ verified: true }).replace('<time class="speedrun-checked"', '<span style="display:none"><time class="speedrun-checked"').replace('</time>', '</time></span>'), '.speedrun-checked');
bad(section({ verified: true }).replace('Checked October 3, 2026</time>', '<span hidden>Checked October 3, 2026</span></time>'), '.speedrun-checked');
bad(section({ verified: true }).replace('class="speedrun-run-link"', 'hidden class="speedrun-run-link"'), 'direct speedrun.com run link');
bad(section({ verified: true }).replace('<div><a class="speedrun-run-link"', '<div style="visibility:hidden"><a class="speedrun-run-link"'), 'direct speedrun.com run link');
bad(section({ verified: true }).replace('View verified run</a>', '<span hidden>View verified run</span></a>'), 'direct speedrun.com run link');
ok(section({ verified: true }).replace('class="speedrun-checked"', 'class="speedrun-checked" style="display:block"').replace('class="speedrun-run-link"', 'class="speedrun-run-link" style="visibility:visible"'));
bad('<div id="section-speedruns" class="game-speedruns"><h2>Speedrun Records</h2><a href="https://speedrun.com">Records</a></div>', 'no .speedrun-card');
bad(section({ category: '' }), 'nonempty .speedrun-category');
bad(section().replace(/\s*<span class="speedrun-category">[\s\S]*?<\/span>/, ''), 'nonempty .speedrun-category');
bad(section({ time: '' }), 'invalid exact .speedrun-time');
bad(section().replace(/\s*<span class="speedrun-time">[\s\S]*?<\/span>/, ''), 'invalid exact .speedrun-time');
bad(section({ time: '~54:08' }), 'invalid exact .speedrun-time');
bad(section({ time: 'about 54 minutes' }), 'invalid exact .speedrun-time');
for (const time of ['1:99', '1:60:00', '1:00:99']) bad(section({ time }), 'invalid exact .speedrun-time');
bad(section({ runner: '' }), 'identifiable .speedrun-runner');
bad(section().replace(/\s*<span class="speedrun-runner">[\s\S]*?<\/span>/, ''), 'identifiable .speedrun-runner');
for (const runner of ['Community Best', 'Community estimate', 'TBD', 'Unknown']) bad(section({ runner }), 'identifiable .speedrun-runner');
for (const runner of ['Community Best (estimate)', '  COMMUNITY   BEST ( ESTIMATE )  ', 'community estimate — unofficial', 'community   estimate - unverified']) {
  bad(section({ runner }), 'identifiable .speedrun-runner');
}
for (const runner of ['CommunityBuilder', 'Community Bestie', 'The Community Best', 'Runner community estimate']) ok(section({ runner }));
bad(`<div id="section-speedruns" class="game-speedruns"><div><div>${section().replace('speedrun-card', 'not-a-card')}</div></div></div><div class="speedrun-card"><span class="speedrun-category">Fake</span><span class="speedrun-time">1:00</span><span class="speedrun-runner">Fake</span></div>`, 'no .speedrun-card');
bad(section({ verified: true, date: null }), '.speedrun-checked');
bad(section({ verified: true, date: '2026-02-30' }), '.speedrun-checked');
bad(section({ verified: true, href: null }), 'direct speedrun.com run link');
for (const href of ['http://www.speedrun.com/game/runs/id', 'https://speedrun.com/game/runs/id', 'https://www.speedrun.com.evil.test/game/runs/id', 'https://evil.test/www.speedrun.com/game/runs/id', 'https://www.speedrun.com/game']) {
  bad(section({ verified: true, href }), 'direct speedrun.com run link');
}
assert.deepStrictEqual(validateGameHtml('<h1>event</h1>', '2025-june-gamecube-on-switch-online.html'), []);
bad('<h1>not event</h1>', 'missing #section-speedruns', '2026-june-gamecube-on-switch-online.html');

const empty = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'rgc-empty-games-'));
process.once('exit', () => fs.rmSync(empty, { recursive: true, force: true }));
assert(auditGames(empty).some(e => e.includes('no HTML pages')));

// Exercise the real audit entry point against an isolated copy, never the working game file.
const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'rgc-audit-entry-'));
process.once('exit', () => fs.rmSync(fixture, { recursive: true, force: true }));
fs.cpSync(root, fixture, { recursive: true, filter: source => path.basename(source) !== '.git' });
const clean = spawnSync(process.execPath, [path.join(fixture, 'tools', 'audit.js'), '--quiet'], { encoding: 'utf8' });
assert.strictEqual(clean.status, 0, `main audit rejected the unchanged copied pages: ${clean.stdout}${clean.stderr}`);
assert.match(clean.stdout, /RGC audit clean/);
const target = path.join(fixture, 'games', '2025-january-super-punch-out.html');
let html = fs.readFileSync(target, 'utf8');
const roots = html.indexOf('<div class="game-speedruns" id="section-speedruns">');
assert(roots >= 0, 'known record-bearing page changed unexpectedly');
const divTags = /<\/?div\b[^>]*>/gi;
divTags.lastIndex = roots;
let depth = 0, end = -1, match;
while ((match = divTags.exec(html))) {
  depth += /^<\/div/i.test(match[0]) ? -1 : 1;
  if (depth === 0) { end = divTags.lastIndex; break; }
}
assert(end > roots, 'balanced speedrun container boundary not found');
html = html.slice(0, roots) + '<div class="game-speedruns" id="section-speedruns"><h2>Speedrun Records</h2><a href="https://www.speedrun.com/spunchout">Records</a></div>' + html.slice(end);
fs.writeFileSync(target, html);
const result = spawnSync(process.execPath, [path.join(fixture, 'tools', 'audit.js'), '--quiet'], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0, 'main audit accepted a link-only copied page');
assert.match(result.stdout + result.stderr, /2025-january-super-punch-out\.html: #section-speedruns has no \.speedrun-card/);

console.log('Speedrun audit tests OK');
