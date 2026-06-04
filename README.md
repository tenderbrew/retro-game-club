# Retro Game Club

A monthly retro gaming community hosted by [Nintendo Pipeline](https://nintendopipeline.club/). Every month the club plays through a classic game together, hangs out on Discord, and awards trophies for beating it and for pulling off harder challenges.

**Live site:** [nintendopipeline.club](https://nintendopipeline.club/)
**Discord:** [discord.gg/2qv6qQbw4A](https://discord.gg/2qv6qQbw4A)

---

## How the Club Works

### Monthly Schedule

| Week | What's happening |
|------|------------------|
| 1–2  | Play the game of the month |
| 3    | Keep playing; share screenshots and gallery art |
| 4    | Keep playing; nominate and vote on next month's game |

### How Games Get Picked

1. Members nominate candidates during the final week of the month.
2. A first-round vote narrows the field.
3. A landslide wins outright; close races go to runoff rounds.
4. The winning platform/version is decided by the vote too.

### Platforms

Anything goes — original hardware, software emulation (RetroArch, Dolphin, DuckStation, etc.), or FPGA (MiSTer, Analogue). Whatever gets you playing.

### Joining

No sign-up. Join the Discord, start playing, submit your feats.

---

## The Trophy System

Each monthly game has up to three tiered trophies, plus occasional bonus trophies for unusual feats (high scores, no-death runs, obscure achievements).

| Tier | Points | Typical requirement |
|------|--------|---------------------|
| 🥇 Gold   | 10 | Mastery-level challenge or rare feat |
| 🥈 Silver | 5  | Moderate challenge beyond just finishing |
| 🥉 Bronze | 1  | Beat the game or reach a major milestone |
| ⭐ Bonus  | 1  | One-off special challenges |

Submissions run on the honor system — most proof is trivially fakeable, so we trust each other. Fabricating submissions can get trophies stricken or earn a suspension.

Trophies feed into two ranking systems:
- **[Leaderboards](https://nintendopipeline.club/leaderboards.html)** — per-year standings
- **[Hall of Fame](https://nintendopipeline.club/hall-of-fame.html)** — all-time rankings and MVP

---

## What's on the Site

- **[Home](https://nintendopipeline.club/)** — current game, upcoming events, retro gaming news feed, top players
- **[Game of the Month archive](https://nintendopipeline.club/game-of-the-month.html)** — every past pick, cover art, platform
- **Per-game pages** — where to play, pricing, trivia, critical reception, trophy winners, speedrun records (verified via the [speedrun.com API](https://github.com/speedruncomorg/api)), soundtrack notes, video spotlight, screenshots
- **[Trophies](https://nintendopipeline.club/trophy-challenges.html)** — every trophy, rarity, and who's claimed it
- **[Users](https://nintendopipeline.club/users.html)** — member directory with individual profile pages (stats, heatmaps, timelines, rivals)
- **[Gallery](https://nintendopipeline.club/gallery.html)** — community screenshots and fan art
- **[Resources](https://nintendopipeline.club/resources.html)** — emulation setup, where to buy, recommended guides

---

## Tech Stack

- **Static site**: plain HTML, CSS, and vanilla JavaScript. No build step, no framework.
- **Hosting**: GitHub Pages, served at [nintendopipeline.club](https://nintendopipeline.club/)
- **Styling**: dark theme, gold (`#d4af37`) accents, Garamond body, Courier New for headers
- **RSS feed**: retro gaming news pulled client-side from RetroRGB via [rss2json.com](https://rss2json.com/), with a static fallback baked into the HTML
- **Speedrun data**: verified against the [speedrun.com REST API](https://github.com/speedruncomorg/api) when building each game page
- **Image pipeline**: [`sharp`](https://sharp.pixelplumbing.com/) (Node.js) for trophy art (800×800 PNG with themed border + Courier New catchphrase), cover art normalization, and compositing
- **Analytics**: Google Analytics (G-WX2NTMVS3Y)

---

## Project Layout

```
index.html              Home page (hero, current game, events, news, top players)
game-of-the-month.html  Calendar grid of every past pick
trophy-challenges.html  Trophy index with rarity bars
leaderboards.html       Yearly rankings
hall-of-fame.html       All-time rankings and MVP
users.html              Member directory
rules.html              Rules & FAQ
resources.html          Emulation guides, where to play
gallery.html            Community submissions
404.html                Custom 404
games/                  One HTML file per month's game
trophies/               One HTML file per trophy (bronze/silver/gold/bonus)
users/                  One HTML file per member
images/
  covers/               Box art
  home/                 Home page banners
  trophies/             Trophy art (800x800)
  users/                Avatars
  screenshots/          Per-game screenshots
  video/                YouTube spotlight thumbnails
  art/                  Community fan art
styles.css              Global stylesheet
sitemap.xml             Sitemap
robots.txt              Robots directives
```

---

## Running Locally

It's a static site — no server required.

```sh
git clone https://github.com/tenderbrew/retro-game-club.git
cd retro-game-club
# open index.html in a browser, or:
python -m http.server 8000
```

Then visit `http://localhost:8000/`.

---

## Contributing

The site is maintained by club leadership, but trophy submissions, screenshots, fan art, and game nominations all flow through [Discord](https://discord.gg/2qv6qQbw4A). If you spot a bug or a broken link, open an issue or PR.

---

## Monthly Update Process

This is the **default scope** for rolling the site over to a new month. Every step below is exercised by default — including the prior-month results pass and image generation. Skip a step only when the maintainer explicitly overrides.

### Inputs to gather first

- Next month's game: title, slug, platform/version
- Trophies: name, tier (gold/silver/bronze + any bonus), requirement, and a short Courier New catchphrase per trophy
- Calendar windows (default: **1–16 play / 16–23 discuss / 24–end vote**)
- Group event date (default: **the first Saturday strictly after the 16th** — never the boundary day)
- Speech bubble copy for the home hero
- Prior month's trophy results (who earned what)
- Cinema Toast Crunch film(s) for the month, if any

### Files to create

- `games/<year>-<month>-<slug>.html` — full game page (info, where-to-play, about, trivia, reception, trophies, speedruns, soundtrack, video, screenshots, sources)
- `trophies/trophy-<slug>-{gold,silver,beatgame,...}.html` — one per trophy
- `images/covers/<slug>.png` — 800×800, dark red plaid background (`rgb(68, 16, 26)`), box art centered at ~90%
- `images/home/<slug>-banner.jpg` — representative in-game screenshot for the home hero
- `images/screenshots/<slug>-1.jpg` … `-4.jpg` — pulled from PSXDataCenter or platform equivalent
- `images/video/<slug>-playthrough.jpg` — YouTube `hqdefault.jpg` for the spotlight video
- `images/trophies/trophy-<slug>-{gold,silver,beatgame,...}.png` — 800×800 with tier-colored gradient frame and Courier New nameplate

### Files to update every month

- `index.html` — hero banner + speech bubble, sidebar calendar, upcoming events, stat strip, 2026 top-players list
- `game-of-the-month.html` — add the new month's card to the current year grid
- `trophy-challenges.html` — append new trophies; bump prior-month rarity bars
- `leaderboards.html` and `hall-of-fame.html` — apply prior month's earned trophies
- `games/<previous-month>.html` — month stats and per-trophy winners. **Stats are winners-only** (we do not track non-winning participants): Players = distinct trophy winners, Trophies Earned = total wins, Challenges Cleared = trophies-with-a-winner / total trophies, Trophy Rate = `round(wins ÷ (players × challenges) × 100)`. Set "Other Participants" to "All participants earned trophies this month!" whenever there's ≥1 winner.
- `trophies/trophy-<previous-month>-*.html` — rarity tier/percentage and holder list (rarity formula in **Consistency rules** below).
- `users/user-<member>.html` — for every member who earned a trophy, keep the **whole** profile in sync, not just the headline stats: rank badge (= Hall of Fame rank), points, trophy counts, tier bar, milestones, crown jewel, trophy collection, games played, heatmap cell, timeline, personal-best spotlights (Gold Rate, Best Month, streak), **plus the "vs Club Average" (h2h) bars, the "Rarity Breakdown" buckets, and the "Closest Rival" card**. Those last three drift silently if skipped — they are NOT optional.
- `sitemap.xml` — add new URLs and bump `lastmod` on changed files

### Consistency rules (enforced by the `rgc-site-audit` workflow)

Site-wide invariants — keep them true by construction; the audit workflow checks them.

- **Member count / rarity denominator:** the club currently has **27 active members**. Every trophy rarity % is `round(holders ÷ 27 × 100)`, and every "N of NN members" / "out of NN club members" string uses **27** — on trophy pages, `trophy-challenges.html`, AND each profile's crown-jewel + "Rarest Trophy" spotlight cards. When membership changes, **recompute every rarity figure** and update this number here.
- **Points:** `gold×10 + silver×5 + bronze×1` (bonus = 1), identical on every leaderboard / Hall of Fame / index / profile row.
- **Cross-file agreement:** a member's gold/silver/bronze/points/rank are identical across their profile, the yearly leaderboards, the Hall of Fame, the index top-players, and the trophy holder lists; per-year sums equal the all-time Hall of Fame totals; the profile rank badge equals the Hall of Fame rank.
- **Profile analytics panels** ("vs Club Average", "Rarity Breakdown", "Closest Rival") reflect current totals and the **recomputed club averages** every month — not stale snapshots.
- **Closest Rival card** is **points-based**: the rival is the member nearest in total points, *excluding exact-point ties* (tie on distance → pick the higher-pointed member). The card shows a gold/silver/bronze medal table comparing the **profile owner** (labelled with their own display name — never "You") against the rival, plus a points-gap badge reading `+N Ahead` / `-N Behind` / `Even`. Because earning a trophy shifts the points ladder, **rebuild every member's rival card** whenever standings change, not just the earner's — a single award can re-pair several members. Mandos's stripped-down profile has no rival card (or h2h panel) and is excluded from these refreshes.
- **Game month-stats are winners-only** (see the games bullet above).

### Asset generation conventions

- Cover and trophy art are produced with `sharp` (Node). The reference scripts live under `C:\tmp\cover-fmt\` during the rollover and can be re-run if a swap is needed.
- Trophy frame uses a tier-themed gradient (gold / silver / bronze) with subtle noise, dark nameplate, Courier New all-caps text.
- Home hero image is wrapped in a CRT scanline + vignette + diagonal-glare overlay (see `.hero-banner-crt` styles).

### Override discipline

Don't trim scope on your own initiative. If a section feels uncertain (review scores for an obscure import, speedrun data, soundtrack credits), flag the placeholders for the maintainer to verify rather than dropping the section. Only skip a step if the maintainer says so.

### Bonus games

Occasionally we run a **bonus game** alongside the regular monthly pick — usually triggered by a real-world hook (a new official release, a notable anniversary, a Nintendo announcement). Bonus games run on an extended window that doesn't have to align with month boundaries, and they share the site's framework but use a few distinct conventions:

- **Slug**: `games/<year>-bonus-<slug>.html` (e.g. `games/2026-bonus-star-fox-2.html`).
- **Game page**: same template as monthly picks — but the hero's date pill becomes a `bonus-badge` ("⭐ Bonus Game · Date Range") and the game-nav at the top/bottom replaces prev/next monthly chaining with simple "Back to Home / Past Games" links.
- **Trophies**: don't fabricate — if the maintainer hasn't supplied trophy info yet, render the `trophy-tbd-card` placeholder in the achievements section and log a follow-up so the trophies can be added later.
- **Home page**: insert the `bonus-callout` strip immediately after the main monthly hero on `index.html`. It's visually subordinate to the monthly pick.
- **Archive**: add the entry to a dedicated **Bonus Games** subsection on `game-of-the-month.html` — never mix bonus games into the monthly grid for that year.
- **Sitemap**: add the bonus URL alongside the regular monthly URL.
- **Stat strip / leaderboards / hall of fame**: bonus games do not contribute to the games count or trophy counts until trophies are defined and earned. Don't bump those numbers on bonus rollout.
