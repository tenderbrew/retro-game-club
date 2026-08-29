# Retro Game Club Project Context

## Purpose and authority

This repository is the static Retro Game Club site. `README.md`, especially **Monthly Update Process** and **Consistency rules**, is the canonical workflow. This file supplies concise project context; the project-local `monthly-rollover` skill supplies the detailed execution sequence.

## Working model

- Mr. Ashby owns code, site structure, assets, and verification.
- Mr. Bellamy owns source-backed game research and flags uncertainty rather than guessing.
- For a monthly rollover, use `.hermes/skills/monthly-rollover/SKILL.md`; delegate independent research, assets, pages, results, and announcement work only when parallelism adds value.
- Brief temporary workers with exact paths, inputs, and acceptance criteria. Reconcile every report against the working tree before accepting it.
- Do not trim rollover scope without Eric's explicit direction. Use visible placeholders for missing inputs.

## Standing invariants

- Run `node tools/audit.js` before any rollover is called complete. It must exit clean.
- Never fabricate bonus-game trophies. Use `trophy-tbd-card` and record the follow-up.
- The group event is the first Saturday strictly after the 16th: always the 17th–23rd.
- Bonus games do not affect stat-strip, leaderboard, or hall-of-fame counts until trophies exist and are earned.
- Discord copy is lowercase, brief, plain, and uses dash-section headers. Do not pitch membership.
- Trophy rarity is `round(holders / active members * 100)`. The current denominator is maintained in `README.md` and `tools/audit.js`; change both together.
- Rarity tiers are Legendary ≤10%, Rare 11–20%, Uncommon 21–40%, Common >40%; zero holders means Unclaimed. Labels, classes, counts, and profile breakdowns must agree.
- Every monthly game page carries the complete dropdown plus First/Previous/Next/Latest. Rebuild all monthly pages each rollover; Latest always means the newest game.
- Advance every elapsed heatmap month out of `heat-future`; refresh Gold Rate, current streak, and Latest Trophy links in the same pass.
- A member award requires a full profile rebuild: headline totals, club-average comparison, rarity breakdown, closest rival, rank badge, heatmap, timeline, and spotlights.
- Closest Rival is points-based, excludes exact-point ties, and resolves distance ties toward higher points. Mandos's minimal profile has no rival/head-to-head panels.
- Monthly player counts are distinct trophy winners only.

## Change discipline

1. Confirm `git status` before editing and preserve unrelated work.
2. Gather every required input listed in `README.md` before implementation.
3. Copy the latest prior-month pages rather than writing monthly pages from scratch.
4. Apply prior-month results across every affected index, game, trophy, user, leaderboard, hall-of-fame, and sitemap surface.
5. Generate all required assets; record substitutions and placeholders.
6. Run both verification commands below and inspect the complete diff.
7. Do not commit or push unless Eric explicitly requests it.

## Verification

```text
node tools/audit.js
node tools/test-hermes-context.js
```

For visual changes, serve the repository and inspect the affected pages at desktop and phone widths. Report created files, modified files, placeholders, unresolved source questions, and the two command results.
