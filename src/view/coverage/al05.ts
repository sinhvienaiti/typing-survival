/** AL-05 (the shared typing feel): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-05 edits this file. */
import { NO_SOUND, row, type CoverageRow } from "./types";

const OWNER = "AL-05";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.keyOk", ["M045", "M046", "M053", "M054", "M149"], ["fx.key.mark", "fx.key.bolt", "fx.bay.lock", "fx.bay.stamp"], ["key.ok", "key.glyph", "bay.lock"], "c"),
  row(OWNER, "ev.keyBad", ["M049", "M050", "M065", "M149"], ["fx.key.wrong", "fx.key.stray", "fx.letter.reveal"], ["key.bad", "key.stray", "key.reveal"], "y"),
  row(OWNER, "ev.word", ["M048", "M060", "M064", "M147", "M150"], ["fx.word.load", "fx.word.perfect", "fx.word.meaning"], ["word.load", "word.perfect", "word.full", "word.whoosh"], "c"),
  row(OWNER, "typing.show", ["M044"], ["fx.strip.show"], ["\u2014"], "k"),
  row(OWNER, "typing.advance", ["M045"], ["fx.key.mark"], ["key.ok", "key.glyph"], "c"),
  row(OWNER, "typing.done", ["M048", "M147", "M150"], ["fx.word.load", "fx.word.perfect", "fx.word.meaning"], ["word.load", "word.perfect", "word.whoosh"], "c"),
  row(OWNER, "typing.wrong", ["M049"], ["fx.key.wrong"], ["key.bad"], "y"),
  row(OWNER, "typing.stray", ["M050"], ["fx.key.stray"], ["key.stray"], "k"),
  row(OWNER, "typing.back", ["M148"], ["fx.key.back"], ["key.back"], "y"),
  row(OWNER, "typing.release", ["M148", "M053"], ["fx.bay.release"], ["bay.release"], "y"),
  row(OWNER, "typing.mask", ["M149"], ["fx.letter.glass", "fx.letter.reveal"], ["key.reveal"], "k", "code"),
  row(OWNER, "ui.bay.release", ["M148", "M053"], ["fx.bay.release"], ["bay.release"], "y"),
  row(OWNER, "ui.key.back", ["M148"], ["fx.key.back"], ["key.back"], "y"),
  row(OWNER, "ui.letter.mask", ["M149"], ["fx.letter.glass"], ["\u2014"], "k", "code"),
  row(OWNER, "ui.letter.reveal", ["M149"], ["fx.letter.reveal"], ["key.reveal"], "k"),
  row(OWNER, "ui.word.perfect", ["M147"], ["fx.word.perfect"], ["word.perfect"], "y"),
  row(OWNER, "ui.key.stray", ["M050"], ["fx.key.stray"], ["key.stray"], "k"),
];
