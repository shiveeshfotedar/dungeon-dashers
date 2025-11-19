const envPort = process.env.PORT;
export const PORT = envPort !== undefined ? Number(envPort) : 8080;

export const STARTING_DECK = [
  {
    id: "ember-burst",
    name: "Ember Burst",
    type: "Spell",
    rarity: "Common",
    tags: ["ignite", "burst"],
    description: "Launch a burst of flame to scorch foes or superheat an ally's weapon.",
    cost: 2,
    playOptions: [
      { id: "sear", label: "Sear", effect: "Deal 3 damage to a single target." },
      { id: "overheat", label: "Overheat", effect: "Empower an ally with +2 attack next turn." }
    ],
    collectEffect: "Store 1 ember charge for later turns.",
    discardEffect: "Gain 1 focus and draw next round."
  },
  {
    id: "aegis-wave",
    name: "Aegis Wave",
    type: "Ward",
    rarity: "Uncommon",
    tags: ["shield"],
    description: "Summon a protective current to deflect harm or rebound spells.",
    cost: 3,
    playOptions: [
      { id: "reflect", label: "Reflect", effect: "Bounce the next hostile effect." },
      { id: "fortify", label: "Fortify", effect: "Grant +4 shield to a teammate." },
      { id: "bubble", label: "Bubble", effect: "Cancel splash damage this round." }
    ],
    collectEffect: "Add 1 shield token to your bank.",
    discardEffect: "Cleanse a minor curse."
  },
  {
    id: "void-lotus",
    name: "Void Lotus",
    type: "Relic",
    rarity: "Rare",
    tags: ["void", "utility"],
    description: "Harness void petals to warp positions or leech energy.",
    cost: 4,
    playOptions: [
      { id: "blink", label: "Blink", effect: "Teleport an ally to any lane." },
      { id: "leech", label: "Leech", effect: "Drain 2 focus from an opponent." }
    ],
    collectEffect: "Add the Lotus to your collection for +1 permanent focus.",
    discardEffect: "Reveal the top card of the deck."
  },
  {
    id: "storm-quill",
    name: "Storm Quill",
    type: "Artefact",
    rarity: "Common",
    tags: ["storm", "utility"],
    description: "Ink the sky with static runes to strike or survey.",
    cost: 1,
    playOptions: [
      { id: "strike", label: "Strike", effect: "Deal 1 damage to up to three targets." },
      { id: "scribe", label: "Scribe", effect: "Peek at the top 2 cards of the deck." }
    ],
    collectEffect: "Bank 1 insight token.",
    discardEffect: "Charge your next spell with +1 range."
  },
  {
    id: "gale-warden",
    name: "Gale Warden",
    type: "Avatar",
    rarity: "Epic",
    tags: ["wind", "summon"],
    description: "Summon a spirit of the gale to reposition allies or silence foes.",
    cost: 5,
    playOptions: [
      { id: "lift", label: "Lift", effect: "Move all allies up one tier." },
      { id: "shush", label: "Shush", effect: "Silence a single enemy for a turn." },
      { id: "surge", label: "Surge", effect: "Grant haste to your team." }
    ],
    collectEffect: "Unlock a wind bond (passive).",
    discardEffect: "Conjure a breeze (gain initiative)."
  }
];

export const HAND_SIZE = 3;

// Deck rules
export const DECK_RULES = {
  minSize: 10,
  maxSize: 40,
  maxCopies: 3 // per card id
};

// Simple named decks for quick-start
export const PREMADE_DECKS = {
  "ember-ward": ["ember-burst", "ember-burst", "aegis-wave", "aegis-wave", "storm-quill", "storm-quill", "void-lotus", "gale-warden", "storm-quill", "aegis-wave"],
  "wind-surge": ["gale-warden", "gale-warden", "storm-quill", "storm-quill", "storm-quill", "void-lotus", "aegis-wave", "ember-burst", "ember-burst", "ember-burst"]
};

// Simple tag-based synergies. If a player has previously played cards that
// provide all required tags, new plays can report a bonus effect.
export const SYNERGY_RULES = [
  {
    name: "Ignite Shield",
    requiresAllTags: ["ignite", "shield"],
    bonusEffect: "Add +2 damage from stored heat."
  },
  {
    name: "Wind Channel",
    requiresAllTags: ["wind", "utility"],
    bonusEffect: "Grant haste to the next action."
  },
  {
    name: "Void Echo",
    requiresAllTags: ["void", "burst"],
    bonusEffect: "Copy a minor effect for free."
  }
];
