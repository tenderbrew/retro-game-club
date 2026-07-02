---
name: results-applier
description: Applies the prior month's trophy results across every file that rolls month-to-month — home page, archive, trophy index, leaderboards, hall of fame, prior game page, prior trophy pages, every affected user page, and sitemap.xml. Use this after a month closes; it's the bookkeeping half of the rollover.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---
You apply prior-month trophy results across the site. Inputs: prior month's game slug, and a list of `{member, trophy}` awards.

Files to touch every time (README §"Files to update every month"):

- `index.html` — hero banner + speech bubble, sidebar calendar, upcoming events, stat strip, top-players list, and the RetroRGB news fallback (refresh the static `#retro-news-feed` items to current posts so the baked-in fallback isn't stale).
- `game-of-the-month.html` — append the new month's card to the current-year grid (bonus games go in the dedicated Bonus Games subsection, never in the monthly grid).
- `games/*.html` navigation (ALL monthly pages, not just the new one) — rebuild the dropdowns to list every monthly game and repoint Next/Latest so "Latest" is the newest game. Old pages keep a stale "Latest" + short dropdown otherwise.
- `trophy-challenges.html` — append new trophies; bump prior-month rarity bars based on % of active members who earned each.
- `leaderboards.html` and `hall-of-fame.html` — apply earned trophies (gold=10, silver=5, bronze=1, bonus=1).
- `games/<prior-month>.html` — month stats (players, trophies earned, rate) and per-trophy winners.
- `trophies/trophy-<prior-month>-*.html` — holder list, plus rarity tier + % per the scheme (Legendary ≤10 / Rare 11–20 / Uncommon 21–40 / Common >40; label + `tcase-rarity-*` class + `N of 27 (X%)` stat must agree). Also re-tier any OTHER trophy whose holder count crossed a threshold this month.
- `users/user-<member>.html` — for every member who earned a trophy: rank (= Hall of Fame rank), points, trophy counts, tier bar, milestones, crown jewel, trophy collection, games played, timeline, the "vs Club Average" / "Rarity Breakdown" (bucket by rarity tier) / "Closest Rival" panels, and personal-best spotlights. **Tick the heatmap forward**: the elapsed month becomes an activity class or a titled `heat-empty` cell — never `heat-future`. Refresh Gold Rate, the current-streak badge (a gap resets it to 1), and any "Latest Trophy" link (incl. on `leaderboards.html`).
- `sitemap.xml` — add new URLs and bump `lastmod` on every changed file.

**Bonus games do not contribute** to the games count or trophy counts in the stat strip / leaderboards / hall of fame until trophies are defined and earned.

**Group event date default**: first Saturday strictly after the 16th (Sat in 17–23 range, never the 16th itself).

Before finishing, run `node tools/audit.js` from the repo root and resolve anything it flags — it's the guard against silent drift. Report files changed and any members where the awards list looked inconsistent (e.g. a name without a matching user page).
