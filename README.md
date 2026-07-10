# Game Hub

A colorful, PlayStation-inspired, installable **PWA** that acts as a hub for online
games. Mobile-first, works offline, and deploys automatically to GitHub Pages.

**Live:** https://cottonstartiet.github.io/GameHub/

## Games

- **🐍 Snake** — 5 obstacle-layout levels, 3 speed modes (easy/medium/hard), swipe &
  keyboard controls, animated achievements and end-game effects. High scores and
  unlocked levels persist locally.

## Tech

- React + TypeScript + Vite
- [Phaser](https://phaser.io/) game engine (games can be 2D or 3D)
- `vite-plugin-pwa` (Workbox) for the installable, offline-capable PWA
- `react-router-dom` (HashRouter) for hub ↔ game navigation under the `/GameHub/` base

## Develop

```bash
npm install
npm run dev        # start Vite dev server
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
npm run gen:icons  # regenerate PWA icons from scripts/generate-icons.mjs
```

## Project structure

```
src/
  theme/         shared CSS-variable theme (also read by Phaser via games/theme.ts)
  pages/         Landing (app-icon grid) and GamePage (loads a game by id)
  components/    GameCard, InstallPrompt
  games/
    registry.ts  game metadata driving the landing grid + routing
    PhaserGame.tsx  StrictMode-safe React↔Phaser mount wrapper
    eventBus.ts  decoupled Phaser↔React event bridge
    theme.ts     adapts CSS theme tokens into Phaser colors
    snake/       Snake game (menu, config, scenes)
  storage/       versioned localStorage persistence
```

## Adding a game

1. Build the game (Phaser scene(s) + a React entry component).
2. Register it in `src/games/registry.ts` — it appears on the hub automatically.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages.

> **One-time setup:** in the repo **Settings → Pages**, set
> **Build and deployment → Source** to **GitHub Actions**.
