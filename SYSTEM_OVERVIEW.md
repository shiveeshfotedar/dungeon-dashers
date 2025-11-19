# Real-Time Card Table System

## Architecture
- **Server**: `game/server/index.js` is a Node/ESM WebSocket host built with `ws`, backed by helpers in `game/server/rooms.js` and `game/server/config.js`. It binds to port `PORT` (default `8080`), keeps an in-memory `rooms` map, and treats each connection as either `table` or `player`. Messages are JSON objects with a `type` field (`join_table`, `join_player`, `play_card`, `turn_start`, `turn_result`, etc.). It now runs the Dungeon Dashers loop: room/monster progression, 10s turn timers, per-turn hand deals, combo resolution, rage, monster card plays, and game over.
- **Controller UI**: `game/controller/index.html` + `game/controller/controller.css` is the phone-friendly interface. It prompts for a room code, opens a socket to `ws://<current-host>:8080`, renders a horizontal scroll 5-card hand each turn with effect labels/badges/art placeholders, and emits `play_card` events (tap to focus, tap Play). It shows party/self HP bars, phase status, and last result; the side drawer holds players, last move, and deck builder. Styling is centralized in `controller.css` and `shared/theme.css`.
- **Table UI**: `game/receiver/index.html` is intended for a TV/large display. It auto-joins room `ABCD`, displays monster/party HP bars, turn countdowns, roster with deck sizes, action grid/log (including boss plays), and room/turn results. It also consumes the shared theme file so art direction changes propagate.

## Key Message Flow
1. **Table joins**: sends `{ type: "join_table", room }`. Server stores its socket and immediately replies with `{ type: "room_state", players: [] }`.
2. **Controller joins**: sends `{ type: "join_player", room, playerId }`. Server appends the player, broadcasts `{ type: "player_joined", playerId, playerCount, playerList }`, and deals a hand via `{ type: "hand", hand: [...] }`.
3. **Card plays**: controller sends `{ type: "play_card", room, playerId, card }`. Server broadcasts `{ type: "card_played", playerId, card }` to table and all players.
4. **Disconnects**: when a player socket closes, server emits `{ type: "player_left", playerId, playerCount, playerList }`. Empty rooms are cleaned up automatically.

## Running Locally
```bash
cd game
npm install
npm run dev             # runs WebSocket + static hosts together
# or manually:
# npm start             # just the ws server
# npm run start:static  # python http.server on port 4173
```
With both processes running, open the table at `http://<your-LAN-ip>:4173/receiver/` and any number of controllers at `http://<your-LAN-ip>:4173/controller/`. All devices must share the same Wi‑Fi/LAN. The WebSocket URLs derive from `window.location.hostname`, so phones automatically point to your server’s IP.

## Feature Highlights
- Live roster updates and status chips on both UI surfaces, driven by `player_joined`/`player_left`.
- Controller “Last Move” feed mirrors other plays (including boss card plays) to keep everyone informed; shows per-player damage taken.
- Table view shows monster/party HP bars, turn countdowns, and stacks card actions in reverse-chronological order while logging every connection and play with timestamps.
- Server runs a per-turn loop (10s timer), resolves combos, rage, monster cards, room progression, and end conditions; new message types (e.g., `turn_start`, `turn_result`, `room_entered`, `room_complete`, `game_over`) are first-class.
- Unified theming via `game/shared/theme.css`, letting you retint backgrounds, buttons, and typography without touching each HTML file.

## Next Ideas
- Promote room management (create/list/delete) and generate secure codes.
- Persist game state (deck, discard, health) server-side for richer deck-builder mechanics.
- Add automated tests (`node --test`) to cover broadcast logic and room lifecycles.
