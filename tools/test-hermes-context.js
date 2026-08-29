const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const mustExist = (relative) => {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`missing ${relative}`);
  }
};

mustExist('AGENTS.md');
mustExist('.hermes/skills/monthly-rollover/SKILL.md');

const agents = read('AGENTS.md');
if (Buffer.byteLength(agents) > 12000) throw new Error('AGENTS.md exceeds 12KB');
if (agents.includes('.claude/agents')) throw new Error('AGENTS.md still routes to Claude agents');

const skill = read('.hermes/skills/monthly-rollover/SKILL.md');
const description = skill.match(/^description:\s*["']?([^\n"']+)/m);
if (!description) throw new Error('skill description missing');
if (description[1].trim().length > 60) throw new Error('skill description exceeds 60 chars');
if (!description[1].trim().endsWith('.')) throw new Error('skill description lacks period');

const shimPath = path.join(root, 'CLAUDE.md');
if (fs.existsSync(shimPath)) {
  const shim = read('CLAUDE.md');
  if (Buffer.byteLength(shim) > 1024) throw new Error('CLAUDE.md is not a compact shim');
  if (!shim.includes('Compatibility Shim')) throw new Error('CLAUDE.md is not identified as a shim');
}

console.log('Retro Game Club Hermes context OK');
