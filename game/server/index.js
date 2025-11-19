// WebSocket game server for Dungeon Dashers: handles rooms, players, turn timers,
// deck validation, combo resolution, and boss actions.
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT, HAND_SIZE } from './config.js';
import {
  addPlayerSocket,
  broadcastToRoom,
  getPlayerIds,
  getRoom,
  removeSocket,
  setTableSocket
} from './rooms.js';
import { validateDeck, resolveDeck } from './decks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.join(__dirname, '..');

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Create HTTP server for static files
const server = createServer((req, res) => {
  let filePath = path.join(gameDir, req.url === '/' ? 'receiver/index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(gameDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // If directory, serve index.html
  if (statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Server Error');
  }
});

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

const TURN_SECONDS = 10;
const MAX_PARTY_HP = 100;

const MONSTERS = [
  { name: "Goblin Pack", hp: 30, attack: 5, ragePerTurn: 8, isBoss: false },
  { name: "Shield Troll", hp: 40, attack: 7, ragePerTurn: 10, isBoss: false },
  { name: "Rune Sentinel", hp: 50, attack: 9, ragePerTurn: 12, isBoss: false },
  { name: "Ogre Captain", hp: 60, attack: 11, ragePerTurn: 14, isBoss: false },
  { name: "Dragon Warden", hp: 100, attack: 15, ragePerTurn: 20, isBoss: true } // FINAL BOSS
];

const MONSTER_DECK = [
  { id: "brutal_claw", name: "Brutal Claw", attack: 8 },
  { id: "overhead_smash", name: "Overhead Smash", attack: 12 },
  { id: "cursed_howl", name: "Cursed Howl", attack: 6 },
  { id: "flame_breath", name: "Flame Breath", attack: 10 },
  { id: "tail_sweep", name: "Tail Sweep", attack: 7 }
];

// Special reward cards - one per victory (4 rewards for 4 victories before boss)
const REWARD_CARDS = [
  { id: "goblin-trophy", name: "Goblin Trophy", attack: 8, boost: 0.15, kind: "attack" }, // +15% damage boost
  { id: "troll-shield", name: "Troll Shield", defense: 10, heal: 3, kind: "defense" }, // Strong defense + heal
  { id: "rune-power", name: "Rune Power", attack: 10, rageDown: 15, kind: "skill" }, // Damage + reduce rage
  { id: "ogre-might", name: "Ogre Might", attack: 12, revealWeakness: true, kind: "attack" } // Big damage + weakness
];

const cardsJson = JSON.parse(readFileSync(path.join(__dirname, "..", "..", "CARDS.json"), "utf8"));

const CARD_EFFECTS = (() => {
  const map = {};
  const add = (entry, props) => { map[entry.id] = { name: entry.name, ...props }; };
  cardsJson.attack.forEach(c => add(c, { attack: c.attack, kind: "attack", tags: ["attack"] }));
  cardsJson.defense.forEach(c => add(c, { ...c, kind: "defense", tags: ["defense"] }));
  cardsJson.skill.forEach(c => add(c, { ...c, kind: "skill", tags: ["skill"] }));
  cardsJson.utility.forEach(c => add(c, { ...c, kind: "utility", tags: ["utility"] }));
  // Dungeon deck quick effects (ids from PREMADE_DECKS)
  map["ember-burst"] = { name: "Ember Burst", attack: 6, kind: "attack", tags: ["ignite", "attack"] };
  map["aegis-wave"] = { name: "Aegis Wave", defense: 6, barrier: true, kind: "defense", tags: ["shield"] };
  map["storm-quill"] = { name: "Storm Quill", attack: 3, kind: "attack", tags: ["utility", "storm"] };
  map["void-lotus"] = { name: "Void Lotus", freeze: true, kind: "utility", tags: ["void"] };
  map["gale-warden"] = { name: "Gale Warden", attack: 5, heal: 2, kind: "skill", tags: ["wind", "attack"] };
  // Reward cards
  REWARD_CARDS.forEach(card => {
    map[card.id] = { ...card, tags: [card.kind] };
  });
  return map;
})();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const parseAttackValue = val => {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.includes("-")) {
    const [min, max] = val.split("-").map(Number);
    return randomInt(min, max);
  }
  if (val === "2x3") return 2 * 3;
  return 0;
};

const initGameState = () => ({
  roomIndex: 0,
  turnIndex: 0,
  monster: { ...MONSTERS[0] },
  partyHp: MAX_PARTY_HP,
  rage: 0,
  pendingPlays: {},
  timers: {},
  playerState: {}
});

const ensureGame = roomObj => {
  if (!roomObj.game || !roomObj.game.monster) {
    roomObj.game = initGameState();
  }
  return roomObj.game;
};

const nextMonster = game => {
  const nextIndex = game.roomIndex + 1;
  if (nextIndex >= MONSTERS.length) return null;
  return { ...MONSTERS[nextIndex], roomIndex: nextIndex };
};

const startRoom = (room, roomObj, autoStart = false) => {
  const game = ensureGame(roomObj);
  const monster = MONSTERS[game.roomIndex] || MONSTERS[MONSTERS.length - 1];
  game.monster = { ...monster };
  game.turnIndex = 0;
  game.pendingPlays = {};

  broadcastToRoom(room, {
    type: "room_entered",
    roomIndex: game.roomIndex,
    monster: game.monster,
    partyHp: game.partyHp
  });

  // Only auto-start if explicitly requested (for subsequent rooms after first)
  if (autoStart && roomObj.players.length) {
    setTimeout(() => startTurn(room, roomObj), 2000);
  }
};

const startTurn = (room, roomObj) => {
  const game = ensureGame(roomObj);
  if (!roomObj.players.length) return;
  game.turnIndex += 1;
  game.pendingPlays = {};

  if (!roomObj.players.length) {
    setTimeout(() => startTurn(room, roomObj), 1000);
    return;
  }

  // Refill/send hands (simple fresh hand per turn; no persistence yet)
  roomObj.players.forEach(p => {
    const deckList = p.deckList || resolveDeck(p.deckId || "ember-ward");
    const hand = deckList
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    p.hand = hand;
    p.ws.send(JSON.stringify({ type: "hand", hand }));
  });

  broadcastToRoom(room, { type: "turn_start", turnIndex: game.turnIndex, seconds: TURN_SECONDS });

  clearTimeout(game.timers.turn);
  game.timers.turn = setTimeout(() => resolveTurn(room, roomObj), TURN_SECONDS * 1000);
};

const resolveTurn = (room, roomObj) => {
  const game = ensureGame(roomObj);
  const plays = game.pendingPlays;

  // PHASE 1: Resolving phase (3s) - Calculate effects
  broadcastToRoom(room, {
    type: "phase_change",
    phase: "resolving",
    message: "Resolving player actions...",
    duration: 3000
  });

  setTimeout(() => {

  const results = {
    attacks: 0,
    defense: 0,
    heals: 0,
    combosTriggered: [],
    bossAttack: 0,
    partyHp: game.partyHp,
    monsterHp: game.monster.hp,
    rage: game.rage
  };

  const flags = { trap: false, freeze: false, barrier: false, revealWeakness: false };
  let attackCardCount = 0;
  let shieldPlayed = false;
  let healPlayed = false;

  Object.values(plays).forEach(cardId => {
    const effect = CARD_EFFECTS[cardId];
    if (!effect) return;
    if (effect.attack !== undefined) {
      results.attacks += parseAttackValue(effect.attack);
      attackCardCount += 1;
    }
    if (effect.defense !== undefined) {
      results.defense += effect.defense;
      shieldPlayed = true;
    }
    if (effect.heal !== undefined) {
      results.heals += effect.heal;
      healPlayed = true;
    }
    if (effect.trap) flags.trap = true;
    if (effect.freeze) flags.freeze = true;
    if (effect.barrier) flags.barrier = true;
    if (effect.revealWeakness) flags.revealWeakness = true;
    if (effect.boost) results.attacks = Math.round(results.attacks * (1 + effect.boost));
    if (effect.rageDown) game.rage = Math.max(0, game.rage - effect.rageDown);
  });

  if (attackCardCount >= 3) {
    results.attacks = Math.round(results.attacks * 1.5);
    results.combosTriggered.push("TEAM_STRIKE");
  }
  if (shieldPlayed && healPlayed) {
    results.defense = Number.POSITIVE_INFINITY;
    results.combosTriggered.push("PERFECT_DEFENSE");
  }
  if (flags.revealWeakness && attackCardCount >= 2) {
    results.attacks = Math.round(results.attacks * 2.5);
    results.combosTriggered.push("WEAKNESS_COMBO");
  }
  let bossSkips = false;
  if (flags.freeze && flags.barrier) {
    bossSkips = true;
    results.combosTriggered.push("FREEZE_LOCK");
  }

  results.monsterHp = Math.max(0, results.monsterHp - results.attacks);
  game.monster.hp = results.monsterHp;

  // Phase: player effects resolve (damage/defense/heal/combos)
  broadcastToRoom(room, { type: "turn_state", phase: "player_resolve", results });

  game.partyHp = Math.min(MAX_PARTY_HP, game.partyHp + results.heals);
  results.partyHp = game.partyHp;

  broadcastToRoom(room, { type: "turn_result", ...results, phase: "player_resolve" });

  // PHASE 2: Monster Turn (5s) - NESTED inside resolving phase so results/bossSkips are in scope
  setTimeout(() => {
    broadcastToRoom(room, {
      type: "phase_change",
      phase: "monster",
      message: "Monster's Turn...",
      duration: 5000
    });

  setTimeout(() => {
    let monsterPlay = null;
    if (!bossSkips) {
      monsterPlay = MONSTER_DECK[Math.floor(Math.random() * MONSTER_DECK.length)];
      const raw = monsterPlay?.attack ? parseAttackValue(monsterPlay.attack) : game.monster.attack;
      const final = results.defense === Infinity ? 0 : Math.max(0, raw - results.defense);
      results.bossAttack = final;
      game.partyHp = Math.max(0, game.partyHp - final);
      results.partyHp = game.partyHp;
    }

    game.rage += game.monster.ragePerTurn;
    if (game.rage >= 100) {
      game.rage = 0;
      game.partyHp = Math.max(0, game.partyHp - game.monster.attack * 2);
      results.partyHp = game.partyHp;
      results.combosTriggered.push("RAGE_STRIKE");
    }
    results.rage = game.rage;

    if (monsterPlay) {
      // Broadcast boss card for UI logging
      broadcastToRoom(room, {
        type: "card_action",
        playerId: "BOSS",
        cardId: monsterPlay.id,
        cardName: monsterPlay.name,
        action: "play",
        damage: results.bossAttack,
        phase: "boss_play",
        timestamp: Date.now()
      });
    }

    // Final state after boss resolves
    broadcastToRoom(room, { type: "turn_result", ...results, phase: "boss_resolve" });

    if (game.partyHp <= 0) {
      game.gameOver = true; // Mark game as completed
      broadcastToRoom(room, { type: "game_over", result: "defeat", partyHp: 0 });
      clearTimeout(game.timers.turn);
      return;
    }

    if (game.monster.hp <= 0) {
      const currentRoom = game.roomIndex;
      const next = nextMonster(game);

      if (!next) {
        // Final victory - defeated the boss!
        game.gameOver = true; // Mark game as completed
        broadcastToRoom(room, {
          type: "game_over",
          result: "victory",
          partyHp: game.partyHp,
          roomsCleared: MONSTERS.length,
          totalRooms: MONSTERS.length
        });
        clearTimeout(game.timers.turn);
        return;
      }

      // Victory - get reward card for next fight
      const rewardCard = REWARD_CARDS[currentRoom]; // Reward based on room defeated
      broadcastToRoom(room, {
        type: "room_victory",
        roomIndex: currentRoom,
        totalRooms: MONSTERS.length,
        rewardCard: rewardCard,
        nextMonster: next.name,
        partyHp: game.partyHp
      });

      // Add reward card to all players' decks for next fight
      roomObj.players.forEach(p => {
        if (p.deckList && rewardCard) {
          p.deckList.push({ id: rewardCard.id });
        }
      });

      game.roomIndex += 1;
      game.monster = { ...next };
      // Don't auto-start - wait for table to press Enter
      return;
    }

    setTimeout(() => startTurn(room, roomObj), 2000);
  }, 5000); // Monster turn duration (5s)
  }, 0); // Start monster phase immediately after resolving
  }, 3000); // End of resolving phase (3s)

};

wss.on("connection", ws => {
  ws.on("message", raw => {
    const data = JSON.parse(raw);

    if (data.type === "join_table") {
      const room = data.room;
      const roomObj = setTableSocket(room, ws);
      ws.room = room;
      ws.role = "table";

      console.log(`🖥️ TABLE joined room ${room}`);

      // Reset game if it's in a completed state (game over)
      if (roomObj.game && roomObj.game.gameOver) {
        console.log(`🔄 Resetting completed game in room ${room}`);
        roomObj.game = initGameState();
      }

      ws.send(JSON.stringify({
        type: "room_state",
        players: getPlayerIds(room)
      }));

      const game = ensureGame(roomObj);
      // Initialize the room but don't auto-start turns (regardless of player count)
      if (game.turnIndex === 0) {
        startRoom(room, roomObj, false); // false = don't auto-start
      }
      return;
    }

    if (data.type === "start_battle") {
      const room = data.room;
      const roomObj = getRoom(room);
      if (!roomObj) return;

      console.log(`⚔️ Battle starting in room ${room}`);
      startTurn(room, roomObj);
      return;
    }

    if (data.type === "continue_to_next_room") {
      const room = data.room;
      const roomObj = getRoom(room);
      if (!roomObj) return;

      console.log(`➡️ Continuing to next room in ${room}`);
      startRoom(room, roomObj, true);
      return;
    }

    if (data.type === "join_player") {
      const { room, playerId } = data;
      ws.room = room;
      ws.role = "player";
      ws.playerId = playerId;

      const roomObj = addPlayerSocket(room, playerId, ws);
      ws.playedTags = new Set();
      ws.deckId = data.deckId;
      ws.deckList = data.deck;

      console.log(`📱 Player ${playerId} joined ${room}`);

      const playerList = getPlayerIds(room);
      broadcastToRoom(room, {
        type: "player_joined",
        playerId,
        playerCount: playerList.length,
        playerList
      });

      const deckList = resolveDeck(data.deck || data.deckId);
      const valid = validateDeck(deckList);
      if (!valid.ok) {
        ws.send(JSON.stringify({ type: "deck_invalid", reason: valid.reason }));
      } else {
        ws.deckList = deckList;
        ws.deckId = data.deckId;
        ws.send(JSON.stringify({ type: "deck_info", playerId, deckSize: deckList.length }));
        const playerRef = roomObj.players.find(p => p.ws === ws);
        if (playerRef) {
          playerRef.deckList = deckList;
          playerRef.deckId = data.deckId;
        }
      }

      const game = ensureGame(roomObj);
      game.playerState[playerId] = { hp: 20 };

      // If this is the first player and room hasn't started, initialize the room
      if (game.turnIndex === 0 && roomObj.players.length === 1 && roomObj.table) {
        startRoom(room, roomObj, false); // Send room_entered but don't auto-start
      }

      broadcastToRoom(room, {
        type: "deck_info",
        playerId,
        deckSize: ws.deckList?.length || 0
      });
      return;
    }

    if (data.type === "play_card") {
      const room = data.room || ws.room;
      const roomObj = getRoom(room);
      const game = ensureGame(roomObj);
      game.pendingPlays[data.playerId] = data.cardId || data.card;

      broadcastToRoom(room, {
        type: "card_action",
        playerId: data.playerId,
        cardId: data.cardId || data.card,
        cardName: data.cardId || data.card,
        action: "play",
        timestamp: Date.now()
      });

      const allPlayers = getPlayerIds(room);
      if (Object.keys(game.pendingPlays).length >= allPlayers.length) {
        clearTimeout(game.timers.turn);
        resolveTurn(room, roomObj);
      }
      return;
    }
  });

  ws.on("close", () => {
    const removal = removeSocket(ws);
    if (removal?.playerLeft) {
      broadcastToRoom(removal.room, {
        type: "player_left",
        playerId: removal.playerId,
        playerCount: removal.playerList.length,
        playerList: removal.playerList
      });
    }
  });
});

// Start HTTP server (WebSocket is attached to it)
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   TV Display: http://localhost:${PORT}/receiver/`);
  console.log(`   Controller: http://localhost:${PORT}/controller/`);
  console.log(`   Design System: http://localhost:${PORT}/design-system.html`);
});
