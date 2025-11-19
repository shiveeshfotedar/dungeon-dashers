# Magic-Style Expansion Blueprint

Goal: transform the prototype into a lightweight, Magic: The Gathering–inspired experience where multiple friends join the same receiver (table) and play full hands from their controllers. This plan assumes incremental updates rather than a full rebuild. Follow the checkpoints below to evolve mechanics, networking, UI, and multiplayer rules.

---

## 1. Core Game Concepts

1. **Define the Format**
   - Decide on deck size per player (e.g., 40-card limited) and whether decks are prebuilt or drafted at runtime.
   - Enumerate phases/turn structure: upkeep → main → combat → second main → end.
   - Determine victory conditions (life totals, poison counters, alternative win-cons).
2. **Establish Zones**
   - For each player: library, hand, battlefield (creatures/artifacts/enchantments), graveyard, exile.
   - Shared zones: stack, exile, battlefield for tokens.
3. **Resource System**
   - Track mana colors and pool (if directly mimicking Magic) or a simplified focus system.
   - Decide whether land plays happen automatically or via card actions.

## 2. Server Architecture Updates (`game/server/`)

1. **Room State (`rooms.js`)**
   - extend room objects to hold per-player state:
     ```js
     {
       table: ws,
       players: [ { id, ws } ],
       game: {
         turnOrder: [],
         activePlayer: null,
         zones: {
           [playerId]: {
             library: [...],
             hand: [...],
             battlefield: [...],
             graveyard: [],
             exile: []
           }
         },
         stack: [],
         lifeTotals: { [playerId]: 20 }
       }
     }
     ```
2. **Deck Handling**
   - Move `STARTING_DECK` to represent a master card database.
   - Add helper functions to generate player decks (shuffle, draw starting hands, mulligan).
   - When a player joins, assign a deck and populate their `zones.library` and `zones.hand`.
3. **Turn Engine**
   - Implement a state machine inside `server/index.js`:
     - `startGame(room)` → chooses first player, draws opening hands.
     - `advancePhase(room)` → cycles through phases; enforces draw/untap steps automatically.
   - Broadcast phase changes (`{ type: "phase_change", phase, activePlayer }`) to all clients.
4. **Action Validation**
   - Replace the simple `card_action` pass-through with an authoritative handler:
     ```js
     handleCardAction({ room, playerId, action, cardId, target }) {
       // check priority, mana availability, stack rules
       // move cards between zones
       // push items onto the stack, resolve on priority passes
     }
     ```
   - Track the stack for instants/responses; require players to pass priority before resolution.
5. **Sync Messages**
   - Add new events:
     - `hand_state` (private to each player) containing their current cards.
     - `battlefield_state` (public snapshot).
     - `life_update`, `stack_update`, `graveyard_update`.
   - For privacy, send hand updates only to the owning controller socket.

## 3. Controller Enhancements (`game/controller/`)

1. **Dashboard Layout**
   - Split the controller UI into sections: Hand, Battlefield (your permanents), Stack, Mana Pool, Life Total.
   - Add tabs or collapsible panels for Graveyard/Exile.
2. **Card Interactions**
   - Replace the simple action buttons with context-aware controls:
     - Tap a card in hand → show legal actions (cast, discard, cycle) based on phase and mana.
     - Tap a permanent on battlefield → show activated abilities.
   - Include target selection UI: when a spell requires targets, highlight legal targets (list on controller, or allow tapping entries).
3. **Priority Flow**
   - Display prompts like “Opponent is acting...” and “Priority passed to you”.
   - Add a “Pass Priority” button that sends `{ type: "pass_priority" }` to the server.
4. **State Feedback**
   - Show life total, poison counters, mana pool, and cards in library (count only).
   - Use color coding for mana (white/blue/black/red/green) if supporting all colors.
5. **Accessibility**
   - Provide log of recent stack events and their resolution order.
   - Add tooltips or long-press popovers for card text.

## 4. Receiver Enhancements (`game/receiver/`)

1. **Table Layout**
   - Divide the screen into player boards arranged around the edges. Each board shows:
     - Player name, life total, status (active/priority).
     - Row(s) for creatures, artifacts, lands.
   - Center area displays the stack and resolving spells.
2. **Phase/Turn Tracker**
   - Always highlight current phase and active player.
   - Animate transitions (e.g., gothic clock hand rotating to each phase).
3. **Stack Visualization**
   - Use cards or banners that push upward as the stack grows; highlight the resolving item.
4. **Spectator Log**
   - Expanded action log detailing casts, resolves, combat damage, triggers.
5. **Indicators**
   - Icons for tapped vs. untapped permanents.
   - Visual cues for enchantments/equipment attached to creatures (lines or glows).

## 5. Multiplayer & Networking Considerations

1. **Room Capacity**
   - Decide on max players (2–6). Enforce at join time.
2. **Spectators**
   - Support spectators by allowing `join_table` without occupying a controller slot; they should see the same receiver view.
3. **Reconnect Logic**
   - Persist player state server-side so reconnecting controllers get their current hand/battlefield.
4. **Security & Fair Play**
   - Prevent players from seeing each other’s hands (server sends private payloads).
   - Optionally integrate Firebase/Auth to ensure unique identities.

## 6. Styling & Theming

1. **Continue using `shared/theme.css`** but introduce additional variables for card frames/colors per mana type.
2. **Add art assets** for card frames, mana symbols. Store under `game/shared/assets/`.
3. **Animate phase transitions** with CSS keyframes or WebGL-like effects (e.g., cathedral windows lighting up).

## 7. Animation & Feedback

1. **Card Movements**
   - Animate cards sliding from hand → stack → battlefield → graveyard.
2. **Combat & Damage**
   - Use animated arrows or trails to show attackers/blockers.
3. **Audio**
   - Optional: add subtle sounds for tapping, casting, resolving.

## 8. Step-by-Step Implementation Roadmap

1. **Model Zones**
   - Update `rooms.js` to store per-player zones and life totals.
   - Ensure existing joins initialize these structures.
2. **Deck & Draw Logic**
   - Implement helper functions (`generateDeck`, `drawCards`, `mulligan`) in a new `server/deck.js`.
   - Call them when players join/start game.
3. **Phase Engine**
   - Create a `server/phases.js` module defining allowed actions per phase.
   - In `index.js`, drive the turn loop and broadcast phase updates.
4. **Action Handler**
   - Replace `card_action` handler with a layered validation system:
     - `validateAction`
     - `applyAction`
     - `broadcastStateChanges`
5. **Controller UI**
   - Build new components for hand, battlefield, mana.
   - Add target-selection UI.
   - Handle new server messages (`hand_state`, `battlefield_state`, `priority_update`).
6. **Receiver UI**
   - Redesign layout to show multiple boards.
   - Display stack and logs with more detail.
7. **Testing**
   - Write unit tests for deck draws, phase transitions, and action validation.
   - Simulate multi-player WebSocket sessions to ensure state sync.
8. **Polish**
   - Apply thematic styling (gothic theme extends nicely to MTG).
   - Implement animations for card flow.

By following this plan, you can incrementally expand the prototype into a full-featured Magic-style multiplayer experience while retaining the current architecture. Each step isolates a subsystem (deck handling, phases, UI panels) so development stays manageable. Update this document as decisions evolve (e.g., final turn order or resource system).***
