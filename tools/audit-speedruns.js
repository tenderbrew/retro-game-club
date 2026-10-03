#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const EXEMPT = new Set(['2025-june-gamecube-on-switch-online.html']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const INERT = new Set(['script', 'style', 'template', 'textarea', 'title']);

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    if (!m[1].startsWith('<')) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

function elements(html) {
  const roots = [], stack = [];
  const tags = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let m;
  while ((m = tags.exec(html))) {
    const raw = m[0];
    if (/^<!/.test(raw)) continue;
    const closing = /^<\//.test(raw);
    const name = (raw.match(/^<\/?\s*([\w:-]+)/) || [])[1].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name !== name) continue;
        const node = stack[i];
        stack.length = i;
        node.end = tags.lastIndex;
        node.innerEnd = m.index;
        break;
      }
      continue;
    }
    const node = { name, attributes: attrs(raw), start: m.index, innerStart: tags.lastIndex, end: tags.lastIndex, innerEnd: tags.lastIndex, children: [] };
    if (stack.length) stack[stack.length - 1].children.push(node); else roots.push(node);
    if (RAW.has(name)) {
      // Raw-text contents are not HTML tags; resume only after the real closing tag.
      const close = new RegExp(`</${name}\\s*>`, 'gi');
      close.lastIndex = tags.lastIndex;
      const end = close.exec(html);
      node.innerEnd = end ? end.index : html.length;
      node.end = tags.lastIndex = end ? close.lastIndex : html.length;
    } else if (!VOID.has(name) && !/\/>$/.test(raw)) stack.push(node);
  }
  return roots;
}

const hasClass = (node, cls) => (node.attributes.class || '').split(/\s+/).includes(cls);
const GENERIC_RUNNER = /^(?:community\s+(?:best|estimate)|tbd|unknown)(?:\s*(?:\(\s*(?:estimate|estimated|unofficial|unverified|pending)\s*\)|[-–—:,]\s*(?:estimate|estimated|unofficial|unverified|pending)))*$/i;
const isHidden = node => Object.hasOwn(node.attributes, 'hidden') ||
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(node.attributes.style || '');
function descendants(nodes, predicate, found = []) {
  for (const node of nodes) {
    if (INERT.has(node.name) || isHidden(node)) continue;
    if (predicate(node)) found.push(node);
    descendants(node.children, predicate, found);
  }
  return found;
}
function textOf(html, node) {
  let offset = node.innerStart;
  const parts = [];
  for (const child of node.children) {
    parts.push(html.slice(offset, child.start));
    if (!INERT.has(child.name) && !isHidden(child)) parts.push(textOf(html, child));
    offset = child.end;
  }
  parts.push(html.slice(offset, node.innerEnd));
  return parts.join(' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
}
function validDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.getUTCFullYear() === +m[1] && d.getUTCMonth() + 1 === +m[2] && d.getUTCDate() === +m[3];
}
function validRunLink(node) {
  try {
    const u = new URL(node.attributes.href);
    return u.protocol === 'https:' && u.hostname === 'www.speedrun.com' && !u.port && !u.username && !u.password &&
      !u.search && !u.hash && /^\/[A-Za-z0-9_-]+\/runs\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) &&
      node.attributes.target === '_blank' && (node.attributes.rel || '').split(/\s+/).sort().join(' ') === 'noopener noreferrer';
  } catch { return false; }
}

function validateGameHtml(html, filename) {
  if (EXEMPT.has(path.basename(filename))) return [];
  const roots = elements(html);
  const section = descendants(roots, n => n.attributes.id === 'section-speedruns')[0];
  if (!section) return ['missing #section-speedruns block'];
  if (!hasClass(section, 'game-speedruns')) return ['#section-speedruns must have class game-speedruns'];
  const cards = descendants(section.children, n => hasClass(n, 'speedrun-card'));
  if (!cards.length) return ['#section-speedruns has no .speedrun-card records'];
  const errors = [];
  const verified = section.attributes['data-speedrun-verified'] === 'true';
  if (verified) {
    const checked = descendants(section.children, n => n.name === 'time' && hasClass(n, 'speedrun-checked'));
    if (!checked.some(n => validDate(n.attributes.datetime) && textOf(html, n))) errors.push('verified section needs a visible .speedrun-checked with a valid YYYY-MM-DD datetime');
  }
  cards.forEach((card, i) => {
    const field = cls => descendants(card.children, n => hasClass(n, cls))[0];
    const category = field('speedrun-category');
    const time = field('speedrun-time');
    const runner = field('speedrun-runner');
    const categoryText = category && textOf(html, category);
    const timeText = time && textOf(html, time);
    const runnerText = runner && textOf(html, runner);
    const label = `speedrun card ${i + 1}`;
    if (!categoryText) errors.push(`${label} has no nonempty .speedrun-category`);
    if (!timeText || !/^(?:\d+:[0-5]\d(?::[0-5]\d)?(?:\.\d+)?|\d+(?:\.\d+)?s)$/.test(timeText)) errors.push(`${label} has invalid exact .speedrun-time`);
    if (!runnerText || GENERIC_RUNNER.test(runnerText)) errors.push(`${label} has no identifiable .speedrun-runner`);
    if (verified) {
      const links = descendants(card.children, n => n.name === 'a' && hasClass(n, 'speedrun-run-link'));
      if (!links.some(n => validRunLink(n) && textOf(html, n))) errors.push(`${label} needs a valid direct speedrun.com run link`);
    }
  });
  return errors;
}

function auditGames(gamesDir) {
  if (!fs.existsSync(gamesDir) || !fs.statSync(gamesDir).isDirectory()) return ['games directory is missing'];
  const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.html'));
  if (!files.length) return ['games directory contains no HTML pages'];
  return files.flatMap(file => validateGameHtml(fs.readFileSync(path.join(gamesDir, file), 'utf8'), file).map(message => `${file}: ${message}`));
}

module.exports = { auditGames, validateGameHtml, validDate, validRunLink };

if (require.main === module) {
  const errors = auditGames(path.resolve(process.argv[2] || path.join(__dirname, '..', 'games')));
  errors.forEach(error => console.log(`[speedruns] ${error}`));
  process.exitCode = errors.length ? 1 : 0;
}
