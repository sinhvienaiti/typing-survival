/**
 * The words of S0 (docs/BUILD_S0.md §5): levels 1–3 of the shared
 * vocabulary, as a deck of single a–z words (content/deck.ts) with each
 * word's meaning and IPA for the slots and the learning frame. Without the
 * shared files a short built-in list keeps the page playable.
 */
import { loadVocabularyIndex, loadVocabularyLevel } from "../kit/vocab";
import { buildDeck } from "../content/deck";

export type Word = { en: string; vi: string; ipa: string };
export type Vocab = { deck: string[]; words: Map<string, Word>; source: "vocabulary" | "fallback"; hash: string };

const FALLBACK = `good:tốt bad:tệ big:to small:nhỏ cold:lạnh hot:nóng fast:nhanh slow:chậm happy:vui sad:buồn light:ánh_sáng
dark:tối water:nước fire:lửa earth:đất river:sông ocean:đại_dương planet:hành_tinh star:ngôi_sao
moon:mặt_trăng house:ngôi_nhà window:cửa_sổ garden:khu_vườn kitchen:nhà_bếp bread:bánh_mì apple:quả_táo
orange:quả_cam lemon:quả_chanh teacher:giáo_viên doctor:bác_sĩ friend:bạn_bè family:gia_đình mother:mẹ
father:bố child:đứa_trẻ people:mọi_người jump:nhảy run:chạy swim:bơi write:viết read:đọc listen:nghe speak:nói
think:nghĩ learn:học quick:nhanh yellow:màu_vàng violet:màu_tím zebra:ngựa_vằn under:bên_dưới idea:ý_tưởng
kind:tử_tế voice:giọng_nói`;

/** FNV-1a of the deck: a Node replay checks it rebuilt the same deck. */
export function deckHash(deck: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const text of deck) for (let index = 0; index <= text.length; index += 1) hash = Math.imul(hash ^ (index < text.length ? text.charCodeAt(index) : 10), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function make(levels: { en: string; vi: string; ipa: string }[][], source: Vocab["source"]): Vocab {
  const deck = buildDeck(levels);
  const words = new Map<string, Word>();
  for (const entries of levels) for (const entry of entries) {
    const text = entry.en.trim().toLowerCase();
    if (!words.has(text)) words.set(text, { en: entry.en.trim(), vi: entry.vi, ipa: entry.ipa });
  }
  return { deck, words, source, hash: deckHash(deck) };
}

export function fallbackVocab(): Vocab {
  return make([FALLBACK.split(/\s+/).map((pair) => { const [en, vi] = pair.split(":"); return { en: en!, vi: vi!.replace(/_/g, " "), ipa: "" }; })], "fallback");
}

export async function loadVocab(): Promise<Vocab> {
  try {
    const index = await loadVocabularyIndex();
    const levels = await Promise.all([1, 2, 3].map((level) => loadVocabularyLevel(level, index)));
    return make(levels, "vocabulary");
  } catch {
    return fallbackVocab();
  }
}
