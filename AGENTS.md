# Repository Guidelines

## Project Structure & Module Organization
Source lives in `game/`. `server/index.js` plus helpers in `game/server/` run the WebSocket hub. UI layers are decoupled: `game/controller/index.html` (with `game/controller/controller.css`) is the handset, `game/receiver/index.html` is the table. Serve both from the repo root, and they already point to `ws://<current-host>:8080`. Keep new UI surfaces inside their own folder and share assets through `game/shared/` (e.g., `game/shared/theme.css` for palette/typography tokens). Tests should live in `game/tests/` near the runtime module they cover (e.g., `server/rooms.test.js`).

## Build, Test, and Development Commands
From `game/`, install deps with `npm install`. `npm start` runs only the WebSocket backend, while `npm run start:static` serves the HTML via Python. For a one-command workflow use `npm run dev`, which launches both via `concurrently` (and stops both when either exits). Open `http://<LAN-IP>:4173/receiver/` plus `/controller/` on any TV/phone. The server now runs the Dungeon Dashers loop (room progression, 10s turns, combos, rage). Document additional scripts in `package.json` (`npm run lint`, etc.) so the workflow stays discoverable.

## Coding Style & Naming Conventions
Write modern ES modules (top-level `import`/`export`) and favor immutable `const` declarations except when reassignment is intentional. Match the existing two-space indentation and concise arrow functions. WebSocket message payloads follow a `type` string plus camelCase fields (`playerId`, `card`); extend that schema consistently and update both HTML clients when adding new message types. When styling in the HTML files, prefer inline `<style>` blocks scoped to each page, or move shared rules into a `css/` subfolder if they grow.

## Testing Guidelines
Automated coverage is still manual; prioritize adding Node’s built-in test runner (`node --test game/tests/server.test.js`) for server behavior, stubbing the `rooms` map and asserting broadcast results. For UI flows, capture reproducible steps (e.g., “play Fireball from player 1”) and, when possible, script them via Playwright so they can run headlessly. Name tests after the action and outcome (`"play_card broadcasts to table"`), and guard against race conditions by awaiting WebSocket events.

## Commit & Pull Request Guidelines
Commits should stay small, use present-tense imperatives (“Add table broadcast guard”), and explain the “why” in the body when behavior changes. When opening a PR, include: a summary of gameplay or server changes, any new commands (`npm run e2e`), manual test evidence (GIF or bullet list), and linked tasks. Flag breaking protocol changes so controller/table maintainers know to refresh their clients before merging.

## Security & Configuration Tips
Room codes gate cross-client traffic, so avoid logging raw hand contents in production builds. If you introduce environment-specific ports, read them from `process.env.PORT` with a safe fallback, and document required `.env` keys in this guide. Remember to clean up disconnected sockets to prevent memory leaks when hosting long-running rooms.
