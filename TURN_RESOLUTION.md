# TURN_RESOLUTION.md – Turn Logic

The server performs deterministic resolution in this order (10s turn timer):

1. Collect Plays
----------------
Wait until:
- All players submitted OR
- Timer expires

Store as:

pendingPlays = {
  p1: "strike",
  p2: "shield",
  p3: "heal"
}

2. Map Cards → Effects
----------------------
For each card, convert to effect. Boss also pulls from a small deck and broadcasts its played card before the boss-resolution phase.

Dungeon Dashers deck quick mapping:
- ember-burst → { attack: 6 }
- aegis-wave → { defense: 6, barrier: true }
- storm-quill → { attack: 3 }
- void-lotus → { freeze: true }
- gale-warden → { attack: 5, heal: 2 }

Core action set (from CARDS.json):
- strike → { attack: 4 }
- firebolt → { attack: random(4–10) }
- multi_hit → { attack: 2x3 }
- shield → { defense: 6 }
- barrier → { barrier: true }
- dodge → { dodge: 0.5 }
- heal → { heal: 4 }
- boost → { boost: +50% team attack (applied immediately) }
- focus → { rageDown: 20 }
- trap → { trap: true }
- freeze → { freeze: true }
- reveal_weakness → { revealWeakness: true }

3. Aggregate Totals
-------------------
totalAttack = sum(effects.attack)
totalDefense = sum(effects.defense)
totalHeal = sum(effects.heal)
flags = { trap, freeze, barrier, revealWeakness }

4. Apply Combos
---------------
### TEAM STRIKE
if attackCards >= 3:
  totalAttack *= 1.5

### PERFECT DEFENSE
if shield AND heal:
  totalDefense = INF

### WEAKNESS COMBO
if revealWeakness AND attackCards >= 2:
  totalAttack *= 2.5

### FREEZE LOCK
if freeze AND barrier:
  bossSkipsTurn = true
### RAGE STRIKE
If rage >= 100:
  apply double monster attack to party, then reset rage to 0

5. Damage to Monster
--------------------
monsterHp -= totalAttack

6. Monster Attack
-----------------
if bossSkipsTurn: skip

rawDamage = monster.attack

finalDamage = clamp(rawDamage - totalDefense, 0, rawDamage)

partyHp -= finalDamage

7. Apply Healing
----------------
partyHp = min(maxPartyHp, partyHp + totalHeal)

8. Rage Meter
-------------
rage += monster.ragePerTurn

if rage >= 100:
  applyRageAttack()
  rage = 0

9. Broadcast Resolution
-----------------------
Send turn_result to all clients.

10. Room Completion
-------------------
If monsterHp <= 0:
  broadcast room_complete
  advance to next room
