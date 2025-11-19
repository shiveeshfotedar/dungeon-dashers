# PLAYER_FLOWS.md – Player Experience

## 1. Joining the Game
Controller loads:
http://<LAN-IP>:4173/controller/

Player enters room code (e.g., ABCD)
Sends:
{ type: "join_player", room: "ABCD", playerId }

Controller receives:
- room_state
- hand

Receiver shows updated roster.

---

## 2. Turn Start
TV broadcasts:
{ type: "turn_start", seconds: 10 }

Controller:
- Vibrates
- Highlights cards
- Shows “Play your card!”

---

## 3. Playing a Card
Player taps → card expands → swipe up (or tap “Play”).

Sends:
{ type: "play_card", cardId }

Controller UI shows:
“You played Fire Bolt!”

---

## 4. Turn Resolution
TV shows big cinematic resolution.
Controller receives:
{ type: "turn_result", ...summary }

Both show:
- Attack/Damage dealt
- Defense applied
- Heal amount
- Monster attack
- Rage meter

---

## 5. Room Clear
When monsterHp <= 0:

TV:
“Room Cleared!”

Server:
{ type: "room_complete" }

Controller:
“Preparing next room…”

---

## 6. Final Boss
Same loop, higher difficulty.

---

## 7. End of Game
Victory:
Server: { type: "game_over", result: "victory" }

Defeat:
Server: { type: "game_over", result: "defeat" }

TV presents end screen.
Controllers show “Play again.”