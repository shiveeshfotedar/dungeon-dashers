# Extending the Couch-Card Prototype

This document outlines how to evolve the current prototype into a richer game. It covers: adapting card/game mechanics, reskinning the UI theme, and layering in motion/animation. Treat it as a playbook—each section references the files you need to touch and the mindset for doing so safely. Steps are provided so you can follow a consistent workflow.

## 1. Designing Game Mechanics

### Card Definitions & Rules
**Steps**
1. Open `game/server/config.js`.
2. Edit the `STARTING_DECK` array to add/remove card objects. Each object follows:
  ```js
  {
    id: "ember-burst",
    name: "Ember Burst",
    type: "Spell",
    tags: ["ignite", "burst"],
    cost: 2,
    description: "...",
    playOptions: [
      { id: "sear", label: "Sear", effect: "Deal 3 damage" }
    ],
    collectEffect: "Store 1 ember charge.",
    discardEffect: "Gain 1 focus."
  }
  ```
3. Introduce new fields (e.g. `rarity`, `cooldown`) and note that the controller display may need tweaks.
4. Adjust `HAND_SIZE` (same file) to change how many templates the server deals at join time.

### Server-Orchestrated Actions
**Steps**
1. Open `game/server/index.js`.
2. Locate the `if (data.type === "card_action")` block (roughly mid-file).
3. Enforce new rules before the `broadcastToRoom` call. Examples:
  - Track per-player resources in `rooms.js` (extend the room object with `stats`).
  - Reject illegal moves by sending the actor a `{ type: "action_denied", reason }` message.
  - Compute derived effects (damage totals, stacking buffs) and broadcast resolved events.
- For turn-based flow, add new message types (`start_turn`, `end_turn`, `effect_resolved`). Controller/table clients can listen for those to manage UI state (e.g., disabling buttons when it’s not your turn).

### Client Components
**Controller (`game/controller/index.html`)**
1. Scroll to the script section and find the `verbs` object—add text for any new actions (`channel`, `summon`, etc.).
2. Update the card rendering helpers (`renderHand`, `sendCardAction`) to surface new fields (rarity icons, cooldowns). When adding new UI controls, create small helper functions to avoid duplicating markup.
3. Inside `ws.onmessage`, add handling for any new message types you introduce on the server.

**Receiver (`game/receiver/index.html`)**
1. Use the existing `state` object to track extra information (e.g., turn order, buffs).
2. Inside `ws.onmessage`, render new panels when you receive additional events. For example, if you emit `effect_resolved`, create a dedicated board area to display it.
3. Apply CSS transforms or templates to differentiate card types (spells vs relics) if desired.

### Testing Mechanics
- Prefer unit tests for server logic in `game/tests/` (e.g., `rooms.test.js` for room management, `actions.test.js` for card validation).
- For integration tests, script WebSocket clients (using `ws` in Node) to simulate multiple players joining and playing cards, verifying broadcast order and payloads.

## 2. Tuning Styling & Art Direction

### Shared Theme
**Steps**
1. Open `game/shared/theme.css`.
2. Update custom properties (`--gradient-bg`, `--color-text`, etc.) to retint the experience.
3. Adjust font stacks (`--font-body`, `--font-display`) and ensure the corresponding `<link>` tags in each HTML file point to the updated typefaces.
4. Modify `.primary-btn`, `.tag-chip`, `.pill`, etc. once—both controller and receiver adopt the new look automatically.

### Page-Specific Layouts
**Steps**
1. Within each HTML file, adjust the inline `<style>` block to reposition panels or introduce device-specific flourishes.
2. For larger changes, extract those styles into standalone CSS files and `<link>` them next to `theme.css`.
3. Keep art assets (textures, icons) under `game/shared/` so they can be reused across devices.

### Assets & Artifacts
- For pattern overlays or background images, host them locally (e.g., `game/shared/textures/*`) instead of using external URLs so the offline dev experience stays reliable.
- To add animated flourishes that repeat (e.g., flickering lanterns), use CSS `@keyframes` in either the shared theme or page-specific styles.

## 3. Motion & Animation

Motion brings the table to life. A few techniques for this stack:

### CSS Animations
**Steps**
1. In either the shared theme or page `<style>`, declare keyframes:
  ```css
  @keyframes cardEnter {
    from { transform: translateY(30px) scale(0.95); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .spell-card {
    animation: cardEnter 250ms ease-out;
  }
  ```
2. Apply the animation to target elements (`.spell-card`, `.card`).
3. For ambiance, animate pseudo-elements on `.controller-shell` or `.panel`.

### JavaScript-Driven Motion
**Steps**
1. Decide on an animation approach (CSS classes, GSAP, custom `requestAnimationFrame` loops).
2. When a `card_action` arrives, add a class (`.card--cast`) to trigger a CSS animation or call your JS animation routine.
3. Remove or reset the animation state after completion so future events re-trigger it.
4. Consider adding a `shared/animations.js` module to centralize durations/easing curves.

### Considerations
- Keep motion optional: degrade gracefully for low-power devices by checking `prefers-reduced-motion` in CSS or JS.
- Synchronize motion cues with server events—e.g., delay removing a card from the controller until its “casting” animation finishes, then send a `card_action` with a `phase: "resolve"` property.

## Implementation Workflow
1. Prototype mechanics in `server/config.js` and `server/index.js`. Validate via local sockets (`npm run dev`) and logging.
2. Mirror new message types in controller/receiver clients; keep UI components modular so additions don’t sprawl.
3. Adjust theme tokens to match the desired art style; if needed, add new variables (e.g., `--color-shadow`) and use them in both clients.
4. Layer animations, starting with CSS transitions for card entry/exit, then escalate to JS-driven sequences for more elaborate effects.
5. Document each change in `GAMEPLAY_MODS.md` (this file) so future contributors know the intended workflow and tuning knobs. Current loop: 10s turns, per-turn 5-card deal, combo resolution (Team Strike, Perfect Defense, Weakness Combo, Freeze Lock), rage meter, and room progression.

By iterating within this structure, you maintain a clean separation between rules (server/config), presentation (shared/theme + page layouts), and motion (CSS/JS hooks). That makes it easy to experiment with new mechanics or aesthetics without rewriting the entire stack.
