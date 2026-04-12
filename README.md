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
