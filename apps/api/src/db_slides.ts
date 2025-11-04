import type { SlideDeck, SlidePage } from "@summa/shared";
import { randomUUID } from "crypto";

export const decks = new Map<string, SlideDeck>(); // id -> deck
export const decksByLecture = new Map<string, string[]>(); // lectureId -> [deckIds]

export function createDeck(lectureId: string, title: string, pages: SlidePage[]): SlideDeck {
  const id = randomUUID();
  const deck: SlideDeck = { id, lectureId, title, pages, createdAt: Date.now() };
  decks.set(id, deck);
  const arr = decksByLecture.get(lectureId) ?? [];
  arr.push(id);
  decksByLecture.set(lectureId, arr);
  return deck;
}

export function getDeck(id: string) {
  return decks.get(id);
}
export function listDecksByLecture(lectureId: string) {
  const ids = decksByLecture.get(lectureId) ?? [];
  return ids.map(id => decks.get(id)!).filter(Boolean);
}