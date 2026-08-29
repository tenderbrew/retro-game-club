---
name: monthly-rollover
description: Run a complete Retro Game Club monthly rollover.
version: 0.1.0
author: Eric Armbruster, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [retro-game-club, static-site, rollover]
---

# Monthly Rollover

Execute the full monthly site transition without silently dropping research, assets, prior results, profile bookkeeping, or navigation updates. `README.md` remains authoritative for current file lists and formulas.

## When to Use

- Eric names the next monthly game and asks to roll the site forward.
- A month has closed and prior trophy results must be applied.
- A cross-cutting update touches monthly pages, trophies, assets, member profiles, and announcements.

Do not use for a narrow copy or style correction.

## Prerequisites

Collect before editing:

- Next month, game title, slug, and exact platform/version.
- Trophy names, tiers, requirements, and short all-caps catchphrases.
- Prior-month `{member, trophy}` awards.
- Calendar windows, group-event date, home speech copy, and any bonus game or film selection.
- Current active-member denominator from `README.md` and `tools/audit.js`.

If any field is missing, preserve scope with an explicit placeholder and list the follow-up; never invent it.

## Procedure

1. **Establish baseline.** Use `terminal` for `git status --short --branch` and `node tools/audit.js`. Stop on unrelated drift that would overlap the rollover; completion requires a known-clean baseline or a recorded isolation plan.
2. **Read authority.** Use `read_file` on `AGENTS.md` and the Monthly Update Process/Consistency rules in `README.md`. Build an explicit ledger of required inputs, files to create, files to update, assets, and invariants; every ledger row needs an owner and final disposition.
3. **Research with evidence.** Assign Mr. Bellamy or a read-only delegate the game title, slug, and version. Require source URLs for where-to-play, pricing, trivia, reception, speedrun records, soundtrack, video, and screenshots. Mark uncertainty instead of filling gaps.
4. **Parallelize independent work.** When valuable, use `delegate_task` for separate asset, new-page, prior-results, and announcement work. Give each worker exact paths and acceptance criteria; no worker may commit, push, or declare the whole rollover complete.
5. **Build from recent templates.** Copy the newest monthly game and trophy pages. Create the new game page, trophy pages, cover, banner, four screenshots, video thumbnail, and trophy artwork. Bonus pages keep simple navigation; missing bonus trophies use `trophy-tbd-card`.
6. **Apply prior results comprehensively.** Update the home page, archive, every monthly game navigation block, trophy index, leaderboards, hall of fame, prior game/trophy pages, every awarded member's complete profile, and `sitemap.xml`. Recompute ranks, rivalry cards, rarity buckets, heatmaps, streaks, latest links, and every threshold crossing.
7. **Reconcile site-wide invariants.** Check group date, active-member denominator, rarity label/class/stat agreement, winners-only month statistics, bonus-game exclusions, complete game navigation, and elapsed heatmap cells. Completion requires every ledger row resolved or explicitly flagged.
8. **Draft the announcement.** Produce one lowercase plain-text block with dash-section headers. Keep it short, assume an existing-member audience, and point to the trophies page rather than enumerating every trophy.
9. **Verify.** Run `node tools/audit.js` and `node tools/test-hermes-context.js`; both must exit zero. Serve the site and inspect changed pages at desktop and phone widths. Use `git diff --check` and account for every changed/untracked file.
10. **Report.** State created and changed files, test results, visual checks, placeholders, uncertain research, and any maintainer decision. Do not commit or push without explicit direction.

## Pitfalls

- Reference asset scripts from an old workstation may not exist. Recreate the documented output with available repo tooling rather than assuming a machine-local path.
- Do not update only the latest navigation or only a winner's headline totals; both create silent drift.
- Do not count bonus games before defined trophies are earned.
- Do not treat a specialist report as verification; inspect the merged working tree and rerun the audit.

## Verification

A rollover is complete only when the ledger is exhausted, both Node commands return zero, visual checks cover affected desktop and phone layouts, the diff contains no unexplained files, and all placeholders or decisions are reported.
