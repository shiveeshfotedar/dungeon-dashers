# PROTOCOL.md – Dungeon Dashers Message Contract

All messages are JSON objects with a `type` field.
Clients MUST ignore unknown types.

---

# 1. Controller → Server

## join_player
Sent when a phone joins a room.

{
  "type": "join_player",
  "room": "ABCD",
  "playerId": "p1"
}

---

## play_card
Sent when a player selects a card during a turn.

{
  "type": "play_card",
  "room": "ABCD",
  "playerId": "p1",
  "cardId": "strike"
}

---

# 2. Receiver → Server
Receiver only joins once.

## join_table
{
  "type": "join_table",
  "room": "ABCD"
}

No other messages needed.

---

# 3. Server → Receiver & Controllers

## room_state
Sent after table or players join.

{
  "type": "room_state",
  "players": ["p1", "p2"],
  "room": "ABCD"
}

---

## hand
Server deals a hand to the controller.

{
  "type": "hand",
  "hand": ["strike", "shield", "heal", "trap", "firebolt"]
}

---

## room_entered
When a new dungeon room begins.

{
  "type": "room_entered",
  "roomIndex": 3,
  "monster": { "name": "Troll", "hp": 60, "attack": 8, "ragePerTurn": 12 },
  "partyHp": 100
}

---

## turn_start
Broadcast when the 10-second turn timer begins.

{
  "type": "turn_start",
  "turnIndex": 5,
  "seconds": 10
}

---

## turn_result
Turn resolution summary.

{
  "type": "turn_result",
  "attacks": 18,
  "defense": 6,
  "heals": 4,
  "combosTriggered": ["TEAM_STRIKE"],
  "bossAttack": 8,
  "partyHp": 92,
  "monsterHp": 42,
  "rage": 40
}

---

## room_complete
Sent when monster reaches 0 HP.

{
  "type": "room_complete",
  "roomIndex": 3
}

---

## game_over
{
  "type": "game_over",
  "result": "victory" | "defeat",
  "partyHp": 0
}