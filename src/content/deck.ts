/**
 * The deck: the vocabulary's words a gun slot can show (single a–z words),
 * each once, in file order (levels in order). The page and Node replays
 * build it the same way, so a logged run deals the same words.
 */
export function buildDeck(levels: readonly (readonly { en: string }[])[]): string[] {
  const texts: string[] = [];
  const seen = new Set<string>();
  for (const entries of levels) {
    for (const entry of entries) {
      const text = entry.en.trim().toLowerCase();
      if (/^[a-z]+$/.test(text) && !seen.has(text)) {
        seen.add(text);
        texts.push(text);
      }
    }
  }
  return texts;
}
