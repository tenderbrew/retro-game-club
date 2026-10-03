#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const mode = args.includes('--write') ? 'write' : args.includes('--check') ? 'check' : null;
const rootArg = args.indexOf('--root');
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : SOURCE_ROOT;
const allowedArgs = new Set(['--write', '--check', '--root']);
const unknownArgs = args.filter((arg, index) => !allowedArgs.has(arg) && index !== rootArg + 1);

if (!mode || (args.includes('--write') && args.includes('--check')) || rootArg === args.length - 1 || unknownArgs.length) {
  console.error('Usage: node tools/sync-trophy-cards.js (--write|--check) [--root PATH]');
  process.exit(2);
}

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Root must be an existing directory: ${ROOT}`);
  process.exit(2);
}

const catalogPath = path.join(ROOT, 'data', 'trophy-requirements.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const ids = new Set(Object.keys(catalog));
const definitionDir = path.join(ROOT, 'trophies');
const definitionIds = fs.readdirSync(definitionDir)
  .filter(file => /^trophy-[a-z0-9-]+\.html$/.test(file))
  .map(file => file.slice(0, -5))
  .sort();
const catalogIds = [...ids].sort();
if (JSON.stringify(catalogIds) !== JSON.stringify(definitionIds)) {
  const missing = definitionIds.filter(id => !ids.has(id));
  const extra = catalogIds.filter(id => !definitionIds.includes(id));
  console.error(`Catalog keys must exactly match trophy definition filenames (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}).`);
  process.exit(1);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}
function trophyId(href = '') {
  const match = href.match(/(?:^|\/)(trophy-[a-z0-9-]+)\.html(?:[?#].*)?$/i);
  const id = match && match[1].toLowerCase();
  return id === 'trophy-challenges' ? null : id;
}
function esc(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function plate(id, indent = '') {
  return `\n${indent}<div class="trophy-challenge-plate" data-trophy-id="${id}">\n${indent}  <span class="trophy-challenge-label">CHALLENGE</span>\n${indent}  <span class="trophy-challenge-requirement">${esc(catalog[id])}</span>\n${indent}</div>`;
}
function attr(source, name) {
  const match = source.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return match && match[1];
}
function hasClass(source, className) {
  return new RegExp(`\\bclass=["'][^"']*\\b${className}\\b`, 'i').test(source);
}
function classList(source) {
  return (attr(source, 'class') || '').split(/\s+/).filter(Boolean);
}

function validateTrophyAnchors(file, source) {
  const rel = path.relative(ROOT, file);
  for (const match of source.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    const anchor = match[0];
    const id = trophyId(attr(anchor, 'href'));
    if (!id) continue;
    if (!ids.has(id)) throw new Error(`${rel}: unknown trophy ID ${id}`);
    const classes = classList(anchor);
    let handled = false;
    if (classes.includes('trophy-plaque')) handled = rel === 'trophy-challenges.html' || rel.startsWith(`games${path.sep}`) || rel.startsWith(`users${path.sep}`);
    else if (classes.includes('timeline-entry')) handled = rel.startsWith(`users${path.sep}`);
    else if (classes.includes('crown-jewel-stage')) handled = rel.startsWith(`users${path.sep}`);
    else if (rel === 'leaderboards.html') handled = true;
    else if (rel.startsWith(`games${path.sep}`) && /<img\b/i.test(anchor)) handled = true;
    if (!handled) throw new Error(`${rel}: unknown trophy-bearing presentation ${classes.join('.') || '(no class)'} for ${id}`);
  }
}
function stripManaged(source) {
  return source.replace(/\s*<div class="trophy-challenge-plate" data-trophy-id="[^"]+">\s*<span class="trophy-challenge-label">CHALLENGE<\/span>\s*<span class="trophy-challenge-requirement">[\s\S]*?<\/span>\s*<\/div>/g, '');
}
function addDataId(open, id) {
  const clean = open.replace(/\sdata-trophy-id="[^"]*"/g, '');
  return clean.replace(/>$/, ` data-trophy-id="${id}">`);
}

function achievementSection(source) {
  const opening = /<div\b[^>]*\bid=["']section-achievements["'][^>]*>/i.exec(source);
  if (!opening) return null;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  let tag;
  while ((tag = tags.exec(source))) {
    depth += /^<\/div/i.test(tag[0]) ? -1 : 1;
    if (!depth) return { start: opening.index, end: tags.lastIndex };
  }
  throw new Error('Unclosed Club Achievements section');
}

function syncAchievementProse(source, rel) {
  const range = achievementSection(source);
  if (!range) return source;
  const section = source.slice(range.start, range.end);
  const plaqueIds = [...section.matchAll(/<a\b[^>]*>/gi)]
    .filter(m => hasClass(m[0], 'trophy-plaque'))
    .map(m => trophyId(attr(m[0], 'href')));
  const proseList = /<ul\b[^>]*\bclass=["'][^"']*\btrivia-list\b[^"']*["'][^>]*>[\s\S]*?<\/ul>/i;
  const list = section.match(proseList);
  if (plaqueIds.length !== 3) {
    if (list && /\bdata-trophy-id\s*=/.test(list[0])) throw new Error(`${rel}: achievement prose IDs have no matching set of three plaques`);
    return source;
  }
  if (plaqueIds.some(id => !ids.has(id)) || new Set(plaqueIds).size !== plaqueIds.length) {
    throw new Error(`${rel}: invalid or duplicate achievement plaque ID`);
  }
  const changed = section.replace(proseList, list => {
    const seen = new Set();
    for (const item of list.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)) {
      const id = attr(item[0].match(/^<li\b[^>]*>/i)[0], 'data-trophy-id');
      if (id === null) continue; // Unlabelled editorial prose is never a trophy objective.
      if (!ids.has(id) || !plaqueIds.includes(id)) throw new Error(`${rel}: unknown or foreign achievement prose ID ${id}`);
      if (seen.has(id)) throw new Error(`${rel}: duplicate achievement prose ID ${id}`);
      if (!/^<li\b[^>]*>\s*<strong>[^<]+<\/strong>\s*(?:<span class="trophy-requirement">[\s\S]*?<\/span>|[^<]+)<\/li>$/i.test(item[0])) {
        throw new Error(`${rel}: malformed achievement prose for ${id}`);
      }
      seen.add(id);
    }
    if (seen.size !== plaqueIds.length) throw new Error(`${rel}: achievement prose ID coverage does not match plaque IDs`);
    return list.replace(/<li\b[^>]*\bdata-trophy-id=["'][^"']+["'][^>]*>\s*(<strong>[^<]+<\/strong>)\s*(?:<span class="trophy-requirement">[\s\S]*?<\/span>|[^<]+)<\/li>/gi, (item, heading) => {
      const id = attr(item, 'data-trophy-id');
      return `<li data-trophy-id="${id}">\n              ${heading} <span class="trophy-requirement">${esc(catalog[id])}</span></li>`;
    });
  });
  return source.slice(0, range.start) + changed + source.slice(range.end);
}

function syncHtml(file, original) {
  const rel = path.relative(ROOT, file);
  let html = stripManaged(original);
  const isDetail = rel.startsWith(`trophies${path.sep}trophy-`);
  const detailId = isDetail ? path.basename(file, '.html') : null;

  if (detailId && ids.has(detailId)) {
    html = html.replace(/<p class="tcase-plaque-text">[\s\S]*?<\/p>/, `<p class="tcase-plaque-text">${esc(catalog[detailId])}</p>`);
    html = html.replace(/(<div class="tcase-nameplate[^>]*>[\s\S]*?<\/div>)\s*<\/div>/, `$1${plate(detailId, '              ')}\n            </div>`);
  }

  html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, anchor => {
    const id = trophyId(attr(anchor, 'href'));
    if (!id || !ids.has(id)) return anchor;
    if (!hasClass(anchor, 'trophy-plaque') && !hasClass(anchor, 'timeline-entry')) return anchor;
    const openEnd = anchor.indexOf('>') + 1;
    const open = addDataId(anchor.slice(0, openEnd), id);
    const body = anchor.slice(openEnd, -4).replace(/\s*$/, '');
    return `${open}${body}${plate(id, '                    ')}\n                  </a>`;
  });

  const crownMatch = html.match(/<a\b[^>]*class="[^"]*crown-jewel-stage[^"]*"[^>]*href="([^"]+)"[^>]*>/i)
    || html.match(/<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*crown-jewel-stage[^"]*"[^>]*>/i);
  const crownId = crownMatch && trophyId(crownMatch[1]);
  if (crownId && ids.has(crownId)) {
    html = html.replace(/(<a\b[^>]*class="[^"]*crown-jewel-stage[^"]*"[^>]*>[\s\S]*?<\/a>)/i, match => {
      const end = match.indexOf('>') + 1;
      return addDataId(match.slice(0, end), crownId) + match.slice(end) + plate(crownId, '            ');
    });
    html = html.replace(/<div class="spotlight-card"[^>]*>(?=\s*<div class="spotlight-card-header">\s*<span[^>]*>[\s\S]*?<span class="spotlight-card-title">Rarest Trophy<\/span>)/i,
      opening => addDataId(opening, crownId));
    html = html.replace(/(<div class="spotlight-card" data-trophy-id="[^"]+">[\s\S]*?<span class="spotlight-card-desc">[\s\S]*?<\/span>)/i,
      `$1${plate(crownId, '                ')}`);
  }

  if (rel.startsWith(`games${path.sep}`)) html = syncAchievementProse(html, rel);

  if (rel === 'leaderboards.html') {
    const names = definitionNames(ROOT);
    html = html.replace(/(<div class="latest-col"><a\b[^>]*href="([^"]+)"[^>]*>)([^<]*)(<\/a><\/div>)/g, (all, start, href, current, end) => {
      const id = trophyId(href);
      if (!id || !names[id]) return all;
      const suffix = current.match(/\s*(\([^)]*\))\s*$/);
      return `${start}${names[id]}${suffix ? ` ${suffix[1]}` : ''}${end}`;
    });
  }
  return html;
}

let cachedNames;
function definitionNames(root) {
  if (cachedNames) return cachedNames;
  cachedNames = {};
  for (const id of ids) {
    const source = fs.readFileSync(path.join(root, 'trophies', `${id}.html`), 'utf8');
    const match = source.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (match) cachedNames[id] = match[1].trim();
  }
  return cachedNames;
}

const changes = [];
const plannedWrites = [];
for (const file of htmlFiles(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  validateTrophyAnchors(file, before);
  const after = syncHtml(file, before);
  if (before !== after) {
    changes.push(path.relative(ROOT, file));
    if (mode === 'write') plannedWrites.push({ file, after });
  }
}

for (const { file, after } of plannedWrites) fs.writeFileSync(file, after);

if (mode === 'check' && changes.length) {
  console.error(`Trophy cards are not synchronized (${changes.length} files):\n${changes.join('\n')}`);
  process.exit(1);
}
console.log(mode === 'write' ? `${changes.length} files changed; trophy cards synchronized.` : 'Trophy cards synchronized.');
