#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const VIEWPORTS = [360, 390, 402, 414, 600, 601, 768, 800, 801, 1024, 1100, 1101, 1440, 1920];
const TOLERANCE = 1.5;
const STRESS_SUFFIX = ' Complete an additional unanticipated challenge with all optional objectives and recorded proof, without shortening the original requirement.';

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean);
  const errors = [];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) { errors.push(`${candidate}: ${error.message}`); }
  }
  throw new Error(`Playwright is required. Install it normally or set PLAYWRIGHT_MODULE to its module directory.\n${errors.join('\n')}`);
}

const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function server() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); return; }
      response.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(data);
    });
  });
}

const profiles = [
  'users/user-1defined.html', 'users/user-1upmuffin.html', 'users/user-anton.html',
  'users/user-asadasa.html', 'users/user-kb.html', 'users/user-metroid.html'
];
const families = [
  { name: 'index-shelf', pages: ['trophy-challenges.html'], card: '.trophy-gallery .trophy-grid .trophy-plaque',
    sections: { art: '.plaque-showcase', nameplate: '.plaque-nameplate', game: '.plaque-game', title: '.plaque-nameplate h3', tier: '.trophy-tier', rarity: '.trophy-card-rarity', challenge: '.trophy-challenge-plate' } },
  { name: 'game-shelf', pages: ['games/2025-december-nights.html', 'games/2026-august-tomba.html', 'games/2026-april-cannon-spike.html'], card: '.trophy-shelf-container .trophy-grid .trophy-plaque',
    sections: { art: '.plaque-showcase', nameplate: '.plaque-nameplate', title: '.plaque-nameplate h3', tier: '.plaque-tier', challenge: '.trophy-challenge-plate' } },
  { name: 'profile-collection', pages: profiles, card: '.trophy-shelf-container .trophy-grid .trophy-plaque',
    sections: { art: '.plaque-showcase', nameplate: '.plaque-nameplate', game: '.plaque-game', title: '.plaque-nameplate h3', tier: '.trophy-tier, .plaque-tier', challenge: '.trophy-challenge-plate' } },
  { name: 'detail-case', pages: ['trophies/trophy-ape-escape-silver.html', 'trophies/trophy-billy-hatcher-beatgame.html', 'trophies/trophy-bomberman-hero-gold.html', 'trophies/trophy-cannon-spike-silver.html', 'trophies/trophy-tomba-gold.html'], card: '.tcase-glass',
    sections: { art: '.tcase-exhibit', nameplate: '.tcase-nameplate', title: '.tcase-nameplate-title', game: '.tcase-nameplate-game', tier: '.tcase-nameplate-tier', challenge: '.trophy-challenge-plate' } },
  { name: 'crown-jewel', pages: profiles, card: '.crown-jewel',
    sections: { art: '.crown-jewel-stage', nameplate: '.crown-jewel-info', title: '.crown-jewel-name', game: '.crown-jewel-game', rarity: '.crown-jewel-rarity', challenge: '.trophy-challenge-plate' } },
  { name: 'timeline', pages: profiles, card: '.timeline-track .timeline-entry',
    sections: { art: '.timeline-icon', nameplate: '.timeline-info', title: '.timeline-trophy-name', game: '.timeline-game-name', tier: { selector: '.timeline-tier-badge', optional: true }, challenge: '.trophy-challenge-plate' } },
  // Spotlight prose legitimately varies; the enclosing card and challenge plate do not.
  { name: 'spotlight', pages: profiles, card: '.spotlight-scroller .spotlight-card[data-trophy-id]',
    sections: { challenge: '.trophy-challenge-plate' } }
];

function rounded(number) { return Math.round(number * 100) / 100; }
function option(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find(value => value.startsWith(prefix));
  return argument && argument.slice(prefix.length);
}
function listOption(name) { const value = option(name); return value ? value.split(',').filter(Boolean) : null; }
function selection() {
  const quick = process.argv.includes('--focus') || process.argv.includes('--quick');
  const stress = process.argv.includes('--stress');
  const names = listOption('family') || (quick ? ['crown-jewel'] : null);
  const widths = (listOption('width') || (quick ? ['360'] : VIEWPORTS)).map(Number);
  const js = option('js') || (quick ? 'on' : 'both');
  assert(widths.every(width => VIEWPORTS.includes(width)), `--width must contain only: ${VIEWPORTS.join(', ')}`);
  assert(['on', 'off', 'both'].includes(js), '--js must be on, off, or both');
  const selected = names ? families.filter(family => names.includes(family.name)) : families;
  assert(selected.length && (!names || selected.length === new Set(names).size), `--family must contain only: ${families.map(family => family.name).join(', ')}`);
  const filters = listOption('page');
  return {
    families: selected.map(family => ({ ...family, pages: filters ? family.pages.filter(file => filters.some(filter => file.includes(filter))) : family.pages })),
    widths,
    jsModes: js === 'both' ? [true, false] : [js === 'on'],
    stress
  };
}

async function measure(page, family, file) {
  return page.evaluate(({ family, file, tolerance }) => {
    const rect = element => {
      const box = element.getBoundingClientRect();
      return { top: box.top, width: box.width, height: box.height };
    };
    const results = [...document.querySelectorAll(family.card)]
      .filter(card => card.querySelector('.trophy-challenge-plate'))
      .map((card, index) => {
        const cardRect = rect(card);
        const sections = {};
        for (const [name, definition] of Object.entries(family.sections)) {
          const selector = typeof definition === 'string' ? definition : definition.selector;
          const node = card.querySelector(selector);
          if (node) {
            const box = rect(node);
            sections[name] = { top: box.top - cardRect.top, height: box.height };
          }
        }
        const requirement = card.querySelector('.trophy-challenge-requirement');
        const textClipped = [...card.querySelectorAll('.trophy-challenge-requirement, .plaque-nameplate h3, .plaque-game, .tcase-nameplate-title, .crown-jewel-name, .timeline-trophy-name')].flatMap(element => {
          const clipped = [];
          const range = document.createRange();
          range.selectNodeContents(element);
          for (const box of range.getClientRects()) {
            for (let ancestor = element; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
              const style = getComputedStyle(ancestor);
              const bounds = ancestor.getBoundingClientRect();
              if (['hidden', 'clip'].includes(style.overflowY) && (box.top < bounds.top - tolerance || box.bottom > bounds.bottom + tolerance)) clipped.push(`${element.className || element.tagName} crosses ${ancestor.className || ancestor.tagName} vertically`);
              if (['hidden', 'clip'].includes(style.overflowX) && (box.left < bounds.left - tolerance || box.right > bounds.right + tolerance)) clipped.push(`${element.className || element.tagName} crosses ${ancestor.className || ancestor.tagName} horizontally (${box.left.toFixed(1)}-${box.right.toFixed(1)} vs ${bounds.left.toFixed(1)}-${bounds.right.toFixed(1)})`);
            }
          }
          return clipped;
        });
        const visible = requirement && (() => {
          const style = getComputedStyle(requirement);
          const box = rect(requirement);
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 &&
            box.width > 0 && box.height > 0 && requirement.scrollWidth <= requirement.clientWidth + tolerance &&
            requirement.scrollHeight <= requirement.clientHeight + tolerance;
        })();
        return {
          file, index, id: card.dataset.trophyId || card.querySelector('[data-trophy-id]')?.dataset.trophyId || card.getAttribute('href') || `card-${index}`,
          card: { height: cardRect.height }, sections, visible, textClipped,
          text: requirement && requirement.textContent.trim()
        };
      });
    const documentWidth = document.documentElement.scrollWidth;
    let navIsolation = null;
    if (documentWidth > innerWidth + tolerance && file.startsWith('games/')) {
      const navs = [...document.querySelectorAll('.game-nav')];
      const right = Math.max(0, ...navs.flatMap(nav => [nav, ...nav.querySelectorAll('*')].map(node => node.getBoundingClientRect().right)));
      const previous = navs.map(nav => nav.style.display);
      navs.forEach(nav => { nav.style.display = 'none'; });
      const withoutNavWidth = document.documentElement.scrollWidth;
      navs.forEach((nav, index) => { nav.style.display = previous[index]; });
      const cardsWithinViewport = [...document.querySelectorAll(family.card)]
        .filter(card => card.querySelector('.trophy-challenge-plate'))
        .every(card => {
          const box = card.getBoundingClientRect();
          return box.left >= -tolerance && box.right <= innerWidth + tolerance && card.scrollWidth <= card.clientWidth + tolerance;
        });
      navIsolation = { count: navs.length, right, withoutNavWidth, cardsWithinViewport };
    }
    return { results, documentWidth, viewportWidth: innerWidth, navIsolation };
  }, { family, file, tolerance: TOLERANCE });
}

function assertPage(measurement, family, label, file, width) {
  assert(measurement.results.length, `${label}: no challenge cards found`);
  const overflow = measurement.documentWidth > measurement.viewportWidth + TOLERANCE;
  const nav = measurement.navIsolation;
  // Only a verified game navigation overhang is exempt: removing exactly those
  // navs must eliminate the overflow, and no measured card may protrude.
  assert(!overflow || (nav?.count && nav.right > measurement.viewportWidth + TOLERANCE &&
    measurement.documentWidth <= nav.right + TOLERANCE &&
    nav.withoutNavWidth <= measurement.viewportWidth + TOLERANCE && nav.cardsWithinViewport),
  `${label}: NEW horizontal overflow ${measurement.documentWidth}px > ${measurement.viewportWidth}px (nav isolation ${JSON.stringify(nav)})`);
  for (const card of measurement.results) {
    assert(card.visible, `${label}: ${card.id} challenge is clipped, hidden, or overflowed (${card.text})`);
    assert(!card.textClipped.length, `${label}: ${card.id} text crosses a clipped ancestor: ${[...new Set(card.textClipped)].join('; ')}`);
    if (!process.argv.includes('--stress')) {
      // Budgets include the longest current title/game labels plus padding,
      // without letting equal-card sizing balloon a short nameplate.
      const compactBudgets = {
        'index-shelf': width <= 600 ? 192 : width <= 800 ? 148 : width <= 1100 ? 216 : 160,
        'profile-collection': width <= 600 ? 188 : width <= 800 ? 156 : width <= 1100 ? 224 : 164,
        'detail-case': width <= 600 ? 190 : 170,
        'game-shelf': 100
      };
      const limit = compactBudgets[family.name];
      if (limit) assert(card.sections.nameplate.height <= limit,
        `${label}: ${card.id} nameplate exceeds its measured content budget (${rounded(card.sections.nameplate.height)}px > ${limit}px)`);
    }
    for (const [name, definition] of Object.entries(family.sections)) {
      if (!(typeof definition === 'object' && definition.optional)) assert(card.sections[name], `${label}: ${card.id} missing ${name}`);
    }
  }
}

function assertNormalizedGeometry(cards, family, label) {
  assert(cards.length > 1, `${label}: need at least two cards for a cross-page geometry comparison`);
  const metrics = [{ section: 'card', metric: 'height', values: cards.map(card => ({ card, value: card.card.height })) }];
  for (const section of Object.keys(family.sections)) {
    const present = cards.filter(card => card.sections[section]);
    if (present.length < 2) continue;
    for (const metric of ['top', 'height']) metrics.push({ section, metric, values: present.map(card => ({ card, value: card.sections[section][metric] })) });
  }
  for (const { section, metric, values } of metrics) {
    const minimum = values.reduce((a, b) => a.value <= b.value ? a : b);
    const maximum = values.reduce((a, b) => a.value >= b.value ? a : b);
    const difference = maximum.value - minimum.value;
    assert(difference <= TOLERANCE, `${label}: normalized ${section}.${metric} diverges by ${rounded(difference)}px; minimum ${minimum.card.file}#${minimum.card.id}=${rounded(minimum.value)}px, maximum ${maximum.card.file}#${maximum.card.id}=${rounded(maximum.value)}px (tolerance ${TOLERANCE}px)`);
  }
}

async function main() {
  const selected = selection();
  const listener = server();
  await new Promise((resolve, reject) => listener.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  let cases = 0;
  try {
    for (const javaScriptEnabled of selected.jsModes) for (const width of selected.widths) for (const family of selected.families) {
      assert(family.pages.length, `${family.name}: --page excluded every representative page`);
      const cards = [];
      for (const file of family.pages) {
        const context = await browser.newContext({ viewport: { width, height: 1200 }, javaScriptEnabled });
        try {
          const page = await context.newPage();
          const base = `http://127.0.0.1:${listener.address().port}`;
          await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
          await page.goto(`${base}/${file}`, { waitUntil: 'load' });
          await page.evaluate(async () => {
            await Promise.all([...document.images].map(image => image.decode().catch(() => null)));
            await document.fonts.ready;
          });
          if (selected.stress) {
            const mutation = await page.evaluate(({ selector, suffix }) => {
              document.documentElement.style.fontSize = '24px';
              const card = [...document.querySelectorAll(selector)].find(node => node.querySelector('.trophy-challenge-requirement'));
              const requirement = card?.querySelector('.trophy-challenge-requirement');
              if (!card?.matches(selector) || !requirement) return false;
              const before = requirement.textContent;
              requirement.textContent += suffix;
              return requirement.textContent === before + suffix;
            }, { selector: family.card, suffix: STRESS_SUFFIX });
            assert(mutation, `${family.name}/${file}: stress did not mutate a challenge in the selected family`);
          }
          const label = `${family.name}/${file}/${width}px/js-${javaScriptEnabled ? 'on' : 'off'}`;
          const measurement = await measure(page, family, file);
          if (selected.stress) assert(measurement.results.some(card => card.text.includes(STRESS_SUFFIX.trim())),
            `${label}: selected family measurement omitted the stress mutation`);
          assertPage(measurement, family, label, file, width);
          cards.push(...measurement.results);
          console.log(`MEASURED ${label} (${measurement.results.length} cards)`);
        } finally { await context.close(); }
      }
      const label = `${family.name}/${width}px/js-${javaScriptEnabled ? 'on' : 'off'}`;
      if (!selected.stress) assertNormalizedGeometry(cards, family, label);
      console.log(`PASS ${label} normalized geometry (${cards.length} cards across ${family.pages.length} pages)`);
      cases++;
    }
  } finally {
    await browser.close();
    await new Promise(resolve => listener.close(resolve));
  }
  console.log(`PASS trophy card normalized browser geometry (${cases} family/viewport/mode cases)`);
}

main().catch(error => { console.error(`FAIL trophy card browser geometry\n${error.stack || error.message}`); process.exitCode = 1; });
