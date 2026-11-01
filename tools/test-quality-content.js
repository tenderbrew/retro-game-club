#!/usr/bin/env node
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let failures=0;
function test(name,fn){try{fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}}
const game=(slug)=>read('games/'+slug+'.html');
test('Godzilla Easy individual run identity',()=>{
 const t=game('2026-bonus-godzilla-destroy-all-monsters-melee');assert(t.includes('Any% — Easy — original GameCube'));assert(t.includes('5:57'));assert(t.includes('GSTE'));assert(t.includes('/runs/m3kq526y'));assert(t.includes('PlayStation 5'));
});
test('Tomba PSP individual run identity',()=>{const t=game('2026-august-tomba');assert(t.includes('PlayStation Portable'));assert(t.includes('46:58'));assert(t.includes('Raikou'));assert(t.includes('/runs/yvo6gv8z'));});
test('critic rather than reader review scores',()=>{
 const billy=game('2025-april-billy-hatcher');assert(/reception-source">IGN<\/span>\s*<span class="reception-score">7\.7/.test(billy));assert(/reception-source">(?:<a[^>]+>)?GameSpot(?:<\/a>)?<\/span>\s*<span class="reception-score">6\.7/.test(billy));
 assert(/reception-source">IGN<\/span>\s*<span class="reception-score">8\.5/.test(game('2025-november-brave-fencer-musashi')));
 assert(/reception-source">Nintendo Life<\/span>\s*<span class="reception-score">8(?:<span[^>]*>)?\/10/.test(game('2026-july-mischief-makers')));
});
test('Mischief quotation and current uploader identity',()=>{
 const t=game('2026-july-mischief-makers');for(const phrase of ['A 2D gem on a 3D console','A bright, inventive action-platformer','"Compensates for average graphics'])assert(!t.includes(phrase));assert(t.includes('Diamond Longplays'));assert(t.includes('Paraphrase:'));
});
// Exact approved bytes, scenes and source identities: no title/map/game-over fallback.
const frames=JSON.parse(read('data/gameplay-frame-contract.json'));
const crypto=require('crypto');
assert.equal(frames.length,6);
for(const f of frames)test(`${f.game} approved gameplay slot ${f.slot}`,()=>{
 const t=read(f.page),items=[...t.matchAll(/<a class="game-screenshot-item" href="([^"]+)">\s*<img src="([^"]+)" alt="([^"]+)"/g)];
 const item=items[f.slot-1];assert(item, 'missing gallery slot');
 assert.equal(item[1],'../'+f.destination);assert.equal(item[2],item[1]);assert.equal(item[3],f.alt);
 assert(!t.includes('../'+f.old_asset),'old frame still consumed');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.destination))).digest('hex'),f.sha256,'approved image bytes changed');
 for(const region of [t.split('class="screenshot-credit"')[1]?.split('</p>')[0],t.split('id="section-sources"')[1]?.split('</ul>')[0]])assert(region?.includes(`href="${f.source_page}"`),'source missing from caption or Sources');
});
test('retained Mischief scene description, not boss combat',()=>{
 const t=game('2026-july-mischief-makers');assert(t.includes('alt="Marina stands beside stacked face blocks in a red stone chamber, with a small figure above her."'));assert(t.includes('alt="Marina standing on face blocks beneath overhead rails'));
});
test('unverified current store price not promised and game board not series',()=>{
 const t=game('2026-january-mega-man-legends');assert(!t.includes('$9.99'));assert(!t.includes('speedrun.com/mml"'));assert(t.includes('speedrun.com/mml1'));assert(!t.includes('1998/09/01/mega-man-legends'));
});
test('available covers versioned and rejected old consumers removed',()=>{
 for(const [old,fresh] of [['toy-commander-dreamcast-case.png','toy-commander-retail-plaid-v2.png'],['godzilla-destroy-all-monsters-melee-gamecube-case.png','godzilla-retail-plaid-v2.png'],['eternal-darkness.png','eternal-darkness-retail-plaid-v2.png'],['decap-attack.png','decap-attack-retail-plaid-v2.png']]){
  assert(fs.existsSync(path.join(root,'images/covers',fresh)),fresh);
  for(const folder of ['.','games','users','trophies'])for(const file of fs.readdirSync(path.join(root,folder)).filter(f=>f.endsWith('.html')))assert(!read(path.join(folder,file)).includes(old),file+' stale '+old);
 }
 assert(!read('docs/art-acceptance.md').includes('Use the accepted tall-case black fitting-mat convention'));
});
process.exitCode=failures?1:0;
