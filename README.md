# Retro Game Club

A monthly retro gaming community run by [Nintendo Pipeline](https://nintendopipeline.club/). Each month, members play a classic game together, discuss it on Discord, and earn trophies for in-game achievements.

**Live site:** [nintendopipeline.club](https://nintendopipeline.club/)

## What's Inside

- **Game of the Month** — a curated pick each month spanning consoles from NES to PS2 and beyond
- **Trophy System** — bronze, silver, and gold challenges for every game, with bonus trophies for extra feats
- **User Profiles** — personal pages tracking trophies earned, stats, heatmaps, and milestones
- **Leaderboards & Hall of Fame** — all-time rankings and a points-based MVP system
- **Gallery** — community screenshots, fan art, and memorable moments
- **Resources** — guides on emulation, setup, and where to play each game

## Tech Stack

- Static HTML, CSS, and vanilla JavaScript — no frameworks
- Hosted on GitHub Pages
- Dark theme with gold accents (Garamond body, Courier New headers)
- Client-side RSS feed integration via rss2json.com
- Image processing with Node.js + [sharp](https://sharp.pixelplumbing.com/) for trophy art and cover images

## Project Structure

```
index.html              Home page
game-of-the-month.html  Past games calendar
trophy-challenges.html  Trophy index
leaderboards.html       Rankings
hall-of-fame.html       All-time records
users.html              Member directory
rules.html              Rules & FAQ
resources.html          Emulation & setup guides
gallery.html            Community gallery
games/                  Individual game pages (one per month)
trophies/               Trophy detail pages
users/                  User profile pages
images/                 Covers, trophies, screenshots, avatars, etc.
styles.css              Global stylesheet
sitemap.xml             Sitemap for search engines
```

## Community

Join the discussion on [Discord](https://discord.gg/2qv6qQbw4A).

