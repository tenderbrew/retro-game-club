#!/usr/bin/env node
'use strict';
// Behavioral regressions for the quality-repair contract; no network fixtures.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
// Measure actual text ranges: scrollWidth alone cannot detect PREVIOU / S.
async function checkNavigation(browser, base) {
  const widths = [601, 599, 600, 390, 767, 768, 769, 799, 800, 801, 1099, 1100, 1101, 1440];
  const monthly = fs.readdirSync(path.join(ROOT, 'games')).filter(file => /^\d{4}-(?!bonus-).*\.html$/.test(file));
  const neighborLength = file => Math.max(0, ...[...read(`games/${file}`).matchAll(/class="game-nav-title">([^<]+)/g)].map(match => match[1].length));
  const longest = Math.max(...monthly.map(neighborLength));
  const files = [...new Set(['2026-january-mega-man-legends.html', '2026-october-eternal-darkness.html',
    '2026-november-toy-commander.html', ...monthly.filter(file => neighborLength(file) === longest)])];
  const artifactDir = process.env.QUALITY_NAV_ARTIFACT_DIR;
  if (artifactDir) { assert(path.isAbsolute(artifactDir)); fs.mkdirSync(artifactDir, {recursive:true}); }
  const measurements = [], failures = [];
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({javaScriptEnabled, viewport:{width:601,height:1000}});
    await context.route('**/*', route => {
      const url=new URL(route.request().url());
      if(url.origin!==base) return route.abort();
      // Remove pre-existing global hiding in the served CSS, including no-JS mode.
      if(url.pathname==='/styles.css') return route.fulfill({contentType:'text/css',body:read('styles.css')+'\nhtml, body { overflow-x: visible !important; }'});
      return route.continue();
    });
    const page = await context.newPage();
    try {
      for (const file of files) {
      await page.goto(`${base}/games/${file}`, {waitUntil:'domcontentloaded'});
      await page.evaluate(() => document.fonts.ready);
      for (const width of widths) {
        await page.setViewportSize({width,height:1000});
        const result = await page.evaluate(() => {
          const rect = node => { const r=node.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
          const bad = [], navs = [];
          const contains = (outer, inner) => inner.left >= outer.left-1 && inner.right <= outer.right+1 && inner.top >= outer.top-1 && inner.bottom <= outer.bottom+1;
          for (const nav of document.querySelectorAll('.game-nav')) {
            const bounds=rect(nav), controls=[], texts=[];
            for (const control of nav.querySelectorAll('a, select')) {
              const box=rect(control), style=getComputedStyle(control);
              controls.push({tag:control.tagName,href:control.getAttribute('href'),text:control.tagName==='SELECT' ? control.selectedOptions[0].textContent : control.textContent.trim(),rect:box,font:style.font,fontFamily:style.fontFamily,fontSize:style.fontSize});
              if (!contains(bounds,box) || box.left<0 || box.right>innerWidth+1 || box.width<24 || box.height<24) bad.push(`control outside nav/viewport: ${control.className}`);
              if (control.tagName==='A' && (!control.getAttribute('href') || !control.textContent.trim())) bad.push('missing native navigation access');
            }
            for (let i=0;i<controls.length;i++) for(let j=i+1;j<controls.length;j++) {
              const a=controls[i].rect,b=controls[j].rect;
              if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) bad.push('overlapping controls');
            }
            for (const element of nav.querySelectorAll('.game-nav-small, .game-nav-title')) {
              const style=getComputedStyle(element), box=rect(element), link=rect(element.closest('a')), words=[];
              if (!box.width || !box.height || style.visibility!=='visible') { bad.push(`hidden navigation text: ${element.textContent}`); continue; }
              if (parseFloat(style.fontSize)<9.5) bad.push(`tiny navigation text: ${element.textContent}`);
              const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
              while(walker.nextNode()) {
                const text=walker.currentNode;
                for(const match of text.textContent.matchAll(/\S+/g)) {
                  const range=document.createRange();range.setStart(text,match.index);range.setEnd(text,match.index+match[0].length);
                  const boxes=[...range.getClientRects()].map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}));
                  const lines=new Set(boxes.map(r=>Math.round(r.top)));
                  words.push({word:match[0],rects:boxes});
                  if(lines.size!==1) bad.push(`fragmented word: ${match[0]} (${lines.size} lines)`);
                  if(boxes.some(r=>!contains(link,r) || !contains(bounds,r) || r.left<0 || r.right>innerWidth+1)) bad.push(`text outside control/nav: ${match[0]}`);
                }
              }
              texts.push({text:element.textContent,font:style.font,fontFamily:style.fontFamily,fontSize:style.fontSize,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,wordBreak:style.wordBreak,rect:box,words});
            }
            navs.push({rect:bounds,controls,texts,options:[...nav.querySelectorAll('option')].map(o=>({value:o.value,text:o.textContent}))});
          }
          if(document.documentElement.scrollWidth>innerWidth+1 || document.body.scrollWidth>innerWidth+1) bad.push('document overflow without global hiding');
          return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,fontsStatus:document.fonts.status,navs,bad};
        });
        if(file===files[0] && width===601) {
          const session=await context.newCDPSession(page);
          await session.send('DOM.enable'); await session.send('CSS.enable');
          const {root}=await session.send('DOM.getDocument');
          result.platformFonts={};
          for(const selector of ['.game-nav-small','.game-nav-title','.game-nav-select']) {
            const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});
            result.platformFonts[selector]=(await session.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;
          }
          await session.detach();
        }
        const label=`${file}/${width}px/js-${javaScriptEnabled?'on':'off'}`;
        measurements.push({file,width,javaScriptEnabled,...result});
        failures.push(...result.bad.map(message=>`${label}: ${message}`));
        assert(result.navs.length>=1, `${label}: missing navigation`);
        const selector=result.navs.find(nav=>nav.options.length);
        assert(selector && selector.options.length===monthly.length, `${label}: incomplete monthly dropdown`);
        assert(result.navs[0].controls.some(c=>c.text.toLowerCase().includes('previous')),`${label}: missing Previous`);
        if(artifactDir && [599,601,768].includes(width) && file==='2026-january-mega-man-legends.html') {
          await page.locator('.game-nav').first().screenshot({path:path.join(artifactDir,`nav-${width}-js-${javaScriptEnabled?'on':'off'}.png`)});
        }
      }
      console.log(`NAV measured ${file}/js-${javaScriptEnabled?'on':'off'} at ${widths.length} widths`);
      }
      // Links stay native and usable even with site JavaScript disabled.
      await page.goto(`${base}/games/2026-october-eternal-darkness.html`);
      for(const direction of ['first','prev','next','last']) {
        await page.goto(`${base}/games/2026-october-eternal-darkness.html`);
        const link=page.locator('.game-nav').first().locator(`.nav-${direction}`);
        const destination=new URL(await link.getAttribute('href'),page.url()).href;
        await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(destination);
        assert.equal(page.url(),destination);
      }
      await page.goto(`${base}/games/2026-october-eternal-darkness.html`);
      const select=page.locator('.game-nav-select');
      await select.focus(); await page.keyboard.press('Home');
      assert.equal(await select.inputValue(),'2025-january-super-punch-out.html');
      // The native options remain selectable without JS; the existing onchange
      // navigation is deliberately required only when site scripts are enabled.
      if(javaScriptEnabled) await page.waitForURL(`${base}/games/2025-january-super-punch-out.html`);
    } finally { await context.close(); }
  }
  if(artifactDir) fs.writeFileSync(path.join(artifactDir,'navigation-metrics.json'),JSON.stringify({widths,files,longestNeighborTitleLength:longest,measurements,failures},null,2)+'\n');
  console.log(`NAV measured ${measurements.length} real-page cases; widths ${widths.join(',')}; JS on/off; ${failures.length} errors`);
  assert.equal(failures.length,0,failures.slice(0,30).join('\n'));
}
async function main() {
  if (!process.argv.includes('--nav-only')) {
  await check('static profile count census', () => {
    const bad = [];
    const files = fs.readdirSync(path.join(ROOT, 'users')).filter(f => f.endsWith('.html'));
    for (const file of files) for (const match of read(`users/${file}`).matchAll(/class="count-up" data-target="(\d+)">([^<]*)</g)) {
      if (match[1] !== match[2]) bad.push(`${file}: ${match[2]} != ${match[1]}`);
    }
    assert(!bad.length, bad.join('; '));
    console.log(`CENSUS ${files.length} profiles`);
  });
  await check('six annual latest links', () => {
    const annual = read('leaderboards.html').split('2025 Leaderboard')[1];
    for (const [member, trophy] of Object.entries({ asadasa:'nights', anton:'nights', poochy:'koudelka', hugh:'resident-evil-2', tender:'resident-evil-2', metroid:'billy-hatcher' })) {
      const row = annual.split(`users/user-${member}.html`)[1]?.split('class="latest-col"')[1]?.split('</div>')[0];
      assert(row?.includes(`trophy-${trophy}-beatgame.html`), `${member}: ${row}`);
    }
  });
  await check('Zou paired minimum-holder rarest trophy', () => {
    const html = read('users/user-zou.html');
    const crown = html.split('class="crown-jewel"')[1].split('<!-- Closest Rival -->')[0];
    const spotlight = html.split('<!-- Personal Best Spotlight -->')[1].split('<div class="spotlight-card">')[0];
    for (const component of [crown, spotlight]) {
      assert(component.includes('trophy-tomba-beatgame'), 'must select the held two-holder Tomba tie');
      assert(component.includes('7%') && /(?:2 out of 28|2 of 28)/.test(component), 'must describe two of 28, 7%');
      assert(!component.includes('Koudelka'), 'stale paired identity');
    }
  });
  }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'};
  const server = http.createServer((req,res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (!file.startsWith(ROOT + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error,data) => {
      if (error) {res.writeHead(404,{'content-type':'text/html'});return res.end(read('404.html'));}
      res.writeHead(200,{'content-type':mime[path.extname(file)] || 'application/octet-stream'});res.end(data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
    console.log(`BROWSER Chromium ${browser.version()}`);
    const base=`http://127.0.0.1:${server.address().port}`;
    await check('shared navigation keeps complete direction labels and whole title words',()=>checkNavigation(browser,base));
    if (!process.argv.includes('--nav-only')) {
    const context=await browser.newContext({viewport:{width:768,height:1000}});
    await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
    const page=await context.newPage();
    await check('nested 404 recovery resources',async()=>{
      const response=await page.goto(`${base}/games/quality-regression-missing.html`);
      assert.equal(response.status(),404);
      const refs=await page.evaluate(()=>[document.querySelector('link[rel="stylesheet"][href$="styles.css"]').href,document.querySelector('.logo-image').src,document.querySelector('.btn-primary').href]);
      for(const url of refs){const r=await context.request.get(url);assert.equal(r.status(),200,url);}
    });
    await check('Kirby independent screenshot and art dialogs',async()=>{
      await page.goto(`${base}/games/2025-march-kirby-64.html`);
      await page.locator('.game-screenshot-item').first().click();
      assert(await page.locator('#screenshotLightbox').evaluate(el=>el.classList.contains('active')),'screenshot dialog inactive');
      await page.locator('#lightboxImg').evaluate(img=>img.decode());
      assert(await page.locator('#lightboxImg').evaluate(img=>img.naturalWidth>0));
      await page.keyboard.press('Escape');
      await page.locator('.gallery-thumb').first().click();
      assert(await page.locator('#lightbox').isVisible(),'art dialog inactive');
      await page.locator('#lightbox-img').evaluate(img=>img.decode());
      await page.keyboard.press('Escape');
      assert(await page.locator('.gallery-thumb').first().evaluate(el=>document.activeElement===(el.closest('a') || el)),'art focus not restored');
    });
    await check('Toy screenshot keyboard opening, focus trap and restoration',async()=>{
      await page.goto(`${base}/games/2026-november-toy-commander.html`);
      const first=page.locator('.game-screenshot-item').first();
      assert.equal(await first.evaluate(el=>el.tagName),'A','native link supports no-JS full image');
      await first.focus();await page.keyboard.press('Enter');
      const modal=page.locator('#screenshotLightbox');
      assert.equal(await modal.getAttribute('role'),'dialog');assert.equal(await modal.getAttribute('aria-modal'),'true');
      assert(await modal.getAttribute('aria-label'));
      assert(await modal.evaluate(el=>el.contains(document.activeElement)),'focus not transferred');
      await page.keyboard.press('ArrowLeft');assert.equal((await page.locator('#lightboxCounter').innerText()).trim(),'4 / 4');
      await page.keyboard.press('ArrowRight');assert.equal((await page.locator('#lightboxCounter').innerText()).trim(),'1 / 4');
      for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert(await modal.evaluate(el=>el.contains(document.activeElement)),'Tab escaped');}
      await page.keyboard.press('Escape');assert(await first.evaluate(el=>document.activeElement===el),'focus not restored');
    });
    await check('768px game navigation fits, not merely overflow hidden',async()=>{
      await page.goto(`${base}/games/2026-january-mega-man-legends.html`);
      const bad=await page.locator('.game-nav a, .game-nav select').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width && (r.left<0 || r.right>innerWidth+1)}).map(n=>n.textContent.trim()));
      assert.deepEqual(bad,[]);
    });
    await check('shared game plaque density',async()=>{
      await page.goto(`${base}/games/2026-november-toy-commander.html`);
      const cards=await page.locator('.game-trophy-card').evaluateAll(nodes=>nodes.map(n=>{const p=n.querySelector('.trophy-plaque'),c=p.querySelector('.trophy-challenge-plate');return {width:p.getBoundingClientRect().width,height:n.getBoundingClientRect().height,reserve:c.getBoundingClientRect().height,textHeight:c.querySelector('.trophy-challenge-requirement').getBoundingClientRect().height,labelHeight:c.querySelector('.trophy-challenge-label').getBoundingClientRect().height,padding:parseFloat(getComputedStyle(c).paddingTop)+parseFloat(getComputedStyle(c).paddingBottom)};}));
      assert(cards.length);for(const c of cards){assert(c.width>=220,JSON.stringify(c));assert(c.reserve-c.textHeight-c.labelHeight-c.padding<64,JSON.stringify(c));}
      const winners = await page.locator('.game-trophy-card').evaluateAll(nodes=>nodes.map(n=>{const p=n.querySelector('.trophy-plaque').getBoundingClientRect(),w=n.querySelector('.plaque-winners').getBoundingClientRect();return {top:w.top,plaqueBottom:p.bottom,height:w.height};}));
      for(const w of winners){assert(w.top>=w.plaqueBottom-1,JSON.stringify(w));assert(w.height<=80,JSON.stringify(w));}
    });
    await check('every game screenshot gallery keyboard census',async()=>{
      const pages=fs.readdirSync(path.join(ROOT,'games')).filter(f=>f.endsWith('.html') && read('games/'+f).includes('class="game-screenshot-item"'));
      let openers=0;
      for(const file of pages){
        await page.goto(`${base}/games/${file}`);
        const items=page.locator('.game-screenshot-item');const count=await items.count();openers+=count;
        for(const item of await items.all())assert.equal(await item.getAttribute('href'),await item.locator('img').getAttribute('src'),`${file}: no-JS link mismatch`);
        const first=items.first();await first.focus();await page.keyboard.press('Enter');
        assert(await page.locator('#screenshotLightbox').evaluate(el=>el.classList.contains('active')),file);
        await page.locator('#lightboxImg').evaluate(img=>img.decode());
        await page.keyboard.press('ArrowLeft');assert.equal((await page.locator('#lightboxCounter').innerText()).trim(),`${count} / ${count}`,file);
        await page.keyboard.press('Escape');assert(await first.evaluate(el=>document.activeElement===el),file);
      }
      console.log(`GALLERY CENSUS ${pages.length} pages / ${openers} native image links`);
    });
    await check('six approved gameplay links, decoded modal scenes and source credits',async()=>{
      const frames=JSON.parse(read('data/gameplay-frame-contract.json'));
      for(const f of frames){
        await page.goto(`${base}/${f.page}`);
        const opener=page.locator('.game-screenshot-item').nth(f.slot-1);
        assert.equal(await opener.getAttribute('href'),'../'+f.destination);
        for(const selector of ['.screenshot-credit','#section-sources'])assert(await page.locator(selector).locator(`a[href="${f.source_page}"]`).count(),`${f.page}: missing source ${selector}`);
        await opener.focus();await page.keyboard.press('Enter');
        const image=page.locator('#lightboxImg');await image.evaluate(img=>img.decode());
        assert.equal(await image.getAttribute('alt'),f.alt);
        const rendered=await image.evaluate(img=>({src:new URL(img.src).pathname,dimensions:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit}));
        assert.equal(rendered.src,'/'+f.destination);assert.deepEqual(rendered.dimensions,f.dimensions);assert.equal(rendered.fit,'contain');
        await page.keyboard.press('Escape');assert(await opener.evaluate(el=>document.activeElement===el));
      }
    });
    await context.close();
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
  if(failed)process.exitCode=1;
  console.log(`Quality regressions: ${failed} failed`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
