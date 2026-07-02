# Claude Code notes

The canonical workflow doc is `README.md` — especially §"Monthly Update Process". Follow it without trimming scope unless the maintainer overrides.

## Sub-agent team

For multi-step work, delegate to the specialists in `.claude/agents/`:

- **orchestrator** — leader for the monthly rollover; decomposes and dispatches to the rest.
- **researcher** — game info, speedrun.com records, reception, video, screenshots. Read-only + web.
- **page-builder** — creates new `games/<year>-<month>-<slug>.html` and `trophies/trophy-<slug>-*.html` from prior-month templates.
- **results-applier** — applies prior-month results across `index.html`, `game-of-the-month.html`, `trophy-challenges.html`, `leaderboards.html`, `hall-of-fame.html`, prior game/trophy pages, every affected `users/user-<member>.html`, and `sitemap.xml`.
- **asset-generator** — `sharp` scripts for cover, home banner, screenshots, video thumb, and trophy art. Reference scripts under `C:\tmp\cover-fmt\`.
- **announcer** — drafts Discord announcements in the lowercase `-section` format.

Trigger the leader with something like: *"Use the orchestrator to roll the site over to <month> — game is <title> on <platform>."*

## Standing rules

- **Run `node tools/audit.js` before committing a rollover** — a fast, dependency-free checker for the drift-prone invariants (rarity tiers, profile Rarity Breakdowns, nav dropdowns + "Latest" links, member count, missing images, broken internal links, points/rank vs trophy holder lists, and elapsed heatmap months wrongly marked `heat-future`). It must exit clean. This is the guard that keeps the site from silently drifting between rollovers.
- **Never fabricate trophies for bonus games** — if trophy info isn't supplied, render the `trophy-tbd-card` placeholder and log a follow-up.
- **Group event date**: the first Saturday strictly after the 16th (Sat in 17–23 range, never the 16th itself).
- **Bonus games do not contribute** to stat-strip / leaderboards / hall-of-fame counts until trophies are defined and earned.
- **Discord voice**: lowercase, short, plain; `-section` dash headers; no twee copy; no join-the-club pitch.
- **Don't trim scope** on your own initiative — prefer placeholders flagged for the maintainer over dropped sections.
- **Rarity denominator**: trophy rarity % = `round(holders ÷ 27 × 100)` (27 = current active members). Update every rarity figure — trophy pages, `trophy-challenges.html`, and per-profile crown-jewel/spotlight cards — and bump the count when membership changes (also `DENOM` in `tools/audit.js`). See README §"Consistency rules".
- **Rarity tiers** (a function of holder %): Legendary ≤10 · Rare 11–20 · Uncommon 21–40 · Common >40; 0 holders = Unclaimed. Per trophy, the label + `tcase-rarity-<tier>` class + `N of 27 members (X%)` stat must agree, and each profile's Rarity Breakdown buckets by these tiers. Name the top tier **"Legendary"**, never "Ultra Rare".
- **Game-page nav is site-wide**: every monthly game page has the full dropdown (all monthly games) + First/Previous/Next/Latest, with "Latest" = the newest game. Rebuild across ALL pages every rollover, not just the new one — they drift silently. Bonus pages keep the simple Back-to-Home nav.
- **Heatmaps tick forward**: each rollover, the just-elapsed month becomes an activity class or titled `heat-empty` — never `heat-future`. Refresh Gold Rate, the current-streak badge (a gap resets it to 1, vs the "Longest Streak" historical best), and "Latest Trophy" links (incl. on `leaderboards.html`) the same pass.
- **Profiles update in full**: when a member earns a trophy, also refresh the "vs Club Average", "Rarity Breakdown", and "Closest Rival" panels and the rank badge (= Hall of Fame rank) — not just the headline stats. These drift silently.
- **Closest Rival is points-based**: rival = nearest by total points, excluding exact-point ties (distance tie → higher points). The card labels the owner by their own display name (never "You") and shows a G/S/B owner-vs-rival table + a `+N Ahead`/`-N Behind`/`Even` gap. Any award reshuffles the ladder, so **rebuild every rival card**, not just the earner's. Mandos's minimal profile is excluded (no rival/h2h panels). See README §"Consistency rules".
- **Game month-stats are winners-only**: Players = distinct winners; no non-winning-participant tracking.
