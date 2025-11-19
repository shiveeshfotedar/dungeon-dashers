import { STARTING_DECK, DECK_RULES, PREMADE_DECKS } from './config.js';

const cardIndex = STARTING_DECK.reduce((acc, card) => {
  acc[card.id] = card;
  return acc;
}, {});

export const getCardById = id => cardIndex[id];

export const cloneCard = card => ({
  ...card,
  playOptions: card.playOptions ? card.playOptions.map(opt => ({ ...opt })) : []
});

export const validateDeck = deckList => {
  if (!Array.isArray(deckList)) {
    return { ok: false, reason: "Deck must be an array of card ids." };
  }
  const { minSize, maxSize, maxCopies } = DECK_RULES;
  if (deckList.length < minSize) return { ok: false, reason: `Deck too small (min ${minSize}).` };
  if (deckList.length > maxSize) return { ok: false, reason: `Deck too large (max ${maxSize}).` };

  const counts = {};
  for (const id of deckList) {
    if (!cardIndex[id]) return { ok: false, reason: `Unknown card id: ${id}` };
    counts[id] = (counts[id] || 0) + 1;
    if (counts[id] > maxCopies) return { ok: false, reason: `Too many copies of ${id} (max ${maxCopies}).` };
  }

  return { ok: true };
};

export const resolveDeck = deckNameOrList => {
  if (typeof deckNameOrList === "string" && PREMADE_DECKS[deckNameOrList]) {
    return PREMADE_DECKS[deckNameOrList];
  }
  if (Array.isArray(deckNameOrList)) return deckNameOrList;
  // fallback: simple random sample
  const ids = STARTING_DECK.map(c => c.id);
  return Array.from({ length: DECK_RULES.minSize }, () => ids[Math.floor(Math.random() * ids.length)]);
};

export const dealHandFromDeck = (deckList, count) => {
  const pool = [...deckList];
  const hand = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [id] = pool.splice(idx, 1);
    hand.push(cloneCard(cardIndex[id]));
  }
  return { hand, remainingDeck: pool };
};
