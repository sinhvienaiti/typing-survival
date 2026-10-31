/**
 * The journey's screens (docs/BUILD_S1.md §4.2), DOM in the HUD's overlay
 * like the other screens (survival.css, theme.css variables): the stage
 * select with stars, a stage's briefing (objective with its numbers, the
 * hazard and how it warns, the learning rule, the foes with their counter
 * tags, what is new), and the loadout: five gun cards (magazine, reach,
 * what it counters and where it is poor, "dài tới +1 chữ" for the heavy guns, the
 * Rèn level the stage gives), the stage's threats with a yellow mark where
 * the picked guns answer nothing, and the start button.
 */
import { START_NOTE } from "../app/guide";
import type { Journey } from "../app/journey";
import { counterTag, objectiveText } from "../app/journey";
import { FOES, KIND } from "../content/foes";
import { LEARN_RULES, RIFT, type Stage } from "../content/stage-rules";
import { escapeHtml, hints, menu } from "./screens";

const NEW: Readonly<Record<string, string>> = { brute: "Brute", leader: "Pack Leader", shield: "Shield Guard", hunt: "Hunt goal", rift: "Rift hazard", missing: "Missing letters rule" };

/** The foes a stage sends, with their counter tags. */
function foes(stage: Stage): { name: string; note: string; tag: string; fresh: boolean }[] {
  const out = [{ name: "Swarm", note: "(horde) " + FOES[KIND.mine]!.hp + " HP, comes in numbers", tag: counterTag("swarmNear"), fresh: false }];
  if (stage.scouts.share > 0) out.push({ name: "Scout", note: "(ranged) shoots the ship from 6–9 m", tag: counterTag("scout"), fresh: false });
  if (stage.packs.brute !== undefined) out.push({ name: "Brute", note: "(heavy) armor " + FOES[KIND.brute]!.armour + " · " + FOES[KIND.brute]!.hp + " HP, leads 5 Swarm", tag: counterTag("armoured"), fresh: stage.teach.includes("brute") });
  if (stage.objective.kind === "hunt") out.push({ name: "Pack Leader", note: "(leader) armor " + FOES[KIND.leader]!.armour + " · " + FOES[KIND.leader]!.hp + " HP, 8 Swarm escorts", tag: counterTag("armoured"), fresh: stage.teach.includes("leader") });
  if (stage.packs.shield !== undefined) out.push({ name: "Shield Guard", note: "(guard) shield " + FOES[KIND.shield]!.shield + " blocks frontal shots", tag: counterTag("shield"), fresh: stage.teach.includes("shield") });
  if (stage.packs.splitter !== undefined) out.push({ name: "Splitter", note: "breaks into 3 Shards when killed", tag: counterTag("splitter"), fresh: stage.teach.includes("splitter") });
  return out;
}

function objectiveDetail(stage: Stage): string {
  const o = stage.objective;
  if (o.kind === "hold") return "Hold until time runs out. If your hull hits zero, you lose.";
  return "Pack Leaders arrive at " + o.leaders.join(", ") + " s (a horn sounds). Kill " + o.need + " and the Swarm retreats; let more than " + (o.leaders.length - o.need) + " slip past and you lose.";
}

function hazardDetail(stage: Stage): string {
  if (stage.hazard === null) return "No hazards.";
  return "Rift (a tear in space): every " + stage.hazard.period + " s the left or right wall glows orange for " + String(RIFT.warn) + " s, then Swarm pours out at " + RIFT.zMin + "–" + RIFT.zMax + " m. Keep a close-range gun loaded when it is about to open.";
}

function ruleDetail(stage: Stage): string {
  if (stage.learn === "missing") return "Each word hides one letter; words of seven or more letters hide two. The first letter, meaning and pronunciation always show. A wrong key reveals the hidden letter.";
  return "Bays show each word and its meaning. Your current word shows large above the ship. Its bay adds the pronunciation. Finished words get a ✓.";
}

export function renderJourney(journey: Journey): string {
  const stage = journey.stage;
  switch (journey.screen) {
    case "stages":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-stages">' +
        "<h1>CAMPAIGN</h1>" +
        '<div class="sv-title-en">CHAPTER 1 · VC-7 CORRIDOR</div><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(journey.menu, " sv-stage-list") +
        '<p class="sv-note">Each stage sets bays, Forge levels, and hull. Clear a stage to unlock the next.</p>' +
        hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> briefing · <kbd>Esc</kbd> back") +
        "</div>"
      );
    case "briefing":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-brief">' +
        "<h1>STAGE " + stage.index + " · " + escapeHtml(stage.name.toUpperCase()) + "</h1>" +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<dl class="sv-brief-rules">' +
        "<dt>Goal</dt><dd><b>" + escapeHtml(objectiveText(stage)) + "</b> · " + escapeHtml(objectiveDetail(stage)) + "</dd>" +
        "<dt>Hazard</dt><dd>" + escapeHtml(hazardDetail(stage)) + "</dd>" +
        "<dt>Learning</dt><dd><b>" + escapeHtml(LEARN_RULES[stage.learn].label) + "</b> · " + escapeHtml(ruleDetail(stage)) + "</dd>" +
        "<dt>Gear</dt><dd>" + stage.kit.bays + " bays · Forge " + stage.kit.levels.join("/") + " · hull " + stage.kit.armour + "</dd>" +
        "</dl>" +
        '<ul class="sv-foes">' +
        foes(stage).map((foe) => "<li" + (foe.fresh ? ' class="is-new"' : "") + "><b>" + escapeHtml(foe.name) + "</b>" + (foe.fresh ? "<em>NEW</em>" : "") + "<small>" + escapeHtml(foe.note) + "</small><span>" + escapeHtml(foe.tag) + "</span></li>").join("") +
        "</ul>" +
        (stage.teach.length > 0 ? '<p class="sv-note">This stage teaches: ' + escapeHtml(stage.teach.map((thing) => NEW[thing] ?? thing).join(", ")) + ".</p>" : "") +
        menu(journey.menu, " sv-row") +
        hints("<kbd>Enter</kbd> loadout · <kbd>Esc</kbd> stages") +
        "</div>"
      );
    case "loadout": {
      const cards = journey.cards();
      const threats = journey.threats();
      const bays = stage.kit.bays;
      return (
        '<div class="sv-card sv-panel sv-sheet sv-loadout">' +
        "<h1>LOADOUT</h1>" +
        '<div class="sv-title-en">STAGE ' + stage.index + " · PICK " + bays + " OF 5 · " + journey.picked.length + "/" + bays + "</div>" +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-cards">' +
        cards
          .map(
            (card, n) =>
              '<section class="sv-gun-card sv-' + card.key + (card.on ? " is-on" : "") + (card.picked >= 0 ? " is-picked" : "") + '" data-card="' + n + '">' +
              '<header><kbd>' + (n + 1) + "</kbd><b>" + escapeHtml(card.name) + "</b>" + (card.picked >= 0 ? '<em>BAY ' + (card.picked + 1) + (card.level > 1 ? " · FORGE " + card.level : "") + "</em>" : "") + "</header>" +
              (card.recommended ? '<i class="sv-rec">Recommended</i>' : "") +
              "<small>" + escapeHtml(card.title) + "</small>" +
              "<p>" + escapeHtml(card.magazine) + " · range " + escapeHtml(card.range) + (card.heavy ? " · words +1 letter" : "") + "</p>" +
              '<p class="sv-good">Strong: ' + escapeHtml(card.good || "—") + "</p>" +
              '<p class="sv-poor">Weak: ' + escapeHtml(card.poor || "—") + "</p>" +
              "</section>",
          )
          .join("") +
        "</div>" +
        '<div class="sv-threats"><b>Threats here · share</b>' +
        threats.map((threat) => '<span class="' + (threat.covered ? "" : "is-open") + '" title="' + escapeHtml(threat.counters) + '">' + (threat.covered ? "" : "⚠ ") + escapeHtml(threat.label) + " " + Math.round(threat.weight * 100) + "%</span>").join("") +
        "</div>" +
        '<div class="sv-start' + (journey.cursor === cards.length ? " is-on" : "") + (journey.ready ? "" : " is-off") + '" data-start="1">' +
        // No "fit %" here: the threat score ranked pairs against their measured wins (G3c) the wrong way on stages 2 and 4 (test pass 27/10); the open rows carry ⚠.
        (journey.ready ? "START" + (threats.some((threat) => !threat.covered) ? " · ⚠ UNCOVERED" : "") : "PICK " + (bays - journey.picked.length) + (bays - journey.picked.length === 1 ? " GUN" : " GUNS")) +
        "</div>" +
        (journey.showStartNote ? '<p class="sv-note sv-start-note">' + START_NOTE + "</p>" : "") +
        hints("<kbd>1</kbd>–<kbd>5</kbd> toggle · <kbd>←</kbd><kbd>→</kbd> move · <kbd>Enter</kbd> select · <kbd>Esc</kbd> briefing") +
        "</div>"
      );
    }
    default:
      return "";
  }
}

/** The result's star row (the end screen of a stage run). */
export function starRow(got: readonly boolean[], accuracyBar: number): string {
  const labels = ["Stage cleared", "Hull ≥ 50%", "Accuracy ≥ " + Math.round(accuracyBar * 100) + "%"];
  return '<ul class="sv-star-row">' + got.map((on, k) => '<li class="' + (on ? "is-on" : "") + '"><b>' + (on ? "★" : "☆") + "</b>" + escapeHtml(labels[k]!) + "</li>").join("") + "</ul>";
}
