#!/usr/bin/env node
'use strict';
// Bounded regression for the September bonus / October monthly award batch.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const awards = [
  ...['robin', 'asadasa'].flatMap(member => ['beatgame', 'letters', 'penguins'].map(suffix => [member, `trophy-terranigma-${suffix}`, 'Sep 2026'])),
  ['asadasa', 'trophy-eternal-darkness-beatgame', 'Oct 2026'],
  ['asadasa', 'trophy-eternal-darkness-silver', 'Oct 2026'],
  ['metroid', 'trophy-eternal-darkness-beatgame', 'Oct 2026'],
];
for (const [member, id, month] of awards) {
  const detail = fs.readFileSync(path.join(root, 'trophies', `${id}.html`), 'utf8');
  const holder = [...detail.matchAll(/<a\b[^>]*class="tcase-entry"[^>]*>[\s\S]*?<\/a>/g)].filter(m => m[0].includes(`user-${member}.html`));
  assert.strictEqual(holder.length, 1, `${id}: missing or duplicate authorized holder ${member}`);
  assert.ok(holder[0][0].includes(`class="tcase-entry-date">${month}</span>`), `${id}/${member}: wrong attribution month`);
  const profile = fs.readFileSync(path.join(root, 'users', `user-${member}.html`), 'utf8');
  const collection = [...profile.matchAll(/<a\b[^>]*class="trophy-plaque[^>]*>[\s\S]*?<\/a>/g)].filter(m => m[0].includes(`data-trophy-id="${id}"`));
  const timeline = [...profile.matchAll(/<a\b[^>]*class="timeline-entry[^>]*>[\s\S]*?<\/a>/g)].filter(m => m[0].includes(`data-trophy-id="${id}"`));
  assert.strictEqual(collection.length, 1, `${member}/${id}: collection`);
  assert.strictEqual(timeline.length, 1, `${member}/${id}: timeline`);
  assert.ok(timeline[0][0].includes(`class="timeline-date">${month}</span>`), `${member}/${id}: timeline attribution`);
}
let count = 0;
for (const file of fs.readdirSync(path.join(root, 'trophies')).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'trophies', file), 'utf8');
  count += [...html.matchAll(/<a\b[^>]*class="tcase-entry"/g)].length;
}
assert.strictEqual(count, 132, 'complete holder inventory must be exactly 132');
const gold = fs.readFileSync(path.join(root, 'trophies/trophy-eternal-darkness-gold.html'), 'utf8');
assert.ok(!gold.includes('class="tcase-entry"'), 'Eternal Darkness gold must remain unclaimed');
console.log('PASS - exact nine awards, 132 holders, September bonus / October monthly attribution, static collections and timelines');
