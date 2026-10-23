/**
 * The journey's screens (docs/BUILD_S1.md §4.2), DOM in the HUD's overlay
 * like the other screens (survival.css, theme.css variables): the stage
 * select with stars, a stage's briefing (objective with its numbers, the
 * hazard and how it warns, the learning rule, the foes with their counter
 * tags, what is new), and the loadout: five gun cards (magazine, reach,
 * what it counters and where it is poor, "+1 chữ" for the heavy guns, the
 * Rèn level the stage gives), the stage's threats with a yellow mark where
 * the picked guns answer nothing, and the start button.
 */
import type { Journey } from "../app/journey";
import { counterTag, objectiveText } from "../app/journey";
import { FOES, KIND } from "../content/foes";
import { LEARN_RULES, RIFT, type Stage } from "../content/stage-rules";
import { escapeHtml, hints, menu } from "./screens";

const NEW: Readonly<Record<string, string>> = { brute: "Trâu", leader: "Đầu Đàn", shield: "Khiên", hunt: "Săn Đầu Đàn", rift: "Vết nứt", missing: "Thiếu chữ" };

/** The foes a stage sends, with their counter tags. */
function foes(stage: Stage): { name: string; note: string; tag: string; fresh: boolean }[] {
  const out = [{ name: "Bầy", note: FOES[KIND.mine]!.hp + " máu, đông", tag: counterTag("swarmNear"), fresh: false }];
  if (stage.scouts.share > 0) out.push({ name: "Lính", note: "đứng 6–9 m bắn tàu", tag: counterTag("scout"), fresh: false });
  if (stage.packs.brute !== undefined) out.push({ name: "Trâu", note: "Vỏ " + FOES[KIND.brute]!.armour + " · " + FOES[KIND.brute]!.hp + " máu, dẫn 5 bầy", tag: counterTag("armoured"), fresh: stage.teach.includes("brute") });
  if (stage.objective.kind === "hunt") out.push({ name: "Đầu Đàn", note: "Vỏ " + FOES[KIND.leader]!.armour + " · " + FOES[KIND.leader]!.hp + " máu, 8 bầy hộ tống", tag: counterTag("armoured"), fresh: stage.teach.includes("leader") });
  if (stage.packs.shield !== undefined) out.push({ name: "Khiên", note: "khiên " + FOES[KIND.shield]!.shield + " chắn đạn từ phía trước", tag: counterTag("shield"), fresh: stage.teach.includes("shield") });
  if (stage.packs.splitter !== undefined) out.push({ name: "Tách", note: "vỡ thành 3 mảnh", tag: counterTag("splitter"), fresh: stage.teach.includes("splitter") });
  return out;
}

function objectiveDetail(stage: Stage): string {
  const o = stage.objective;
  if (o.kind === "hold") return "Giữ tuyến tới khi hết giờ. Hết giáp là thua.";
  return "Đầu Đàn tới ở giây " + o.leaders.join(", ") + " (tiếng tù và). Hạ " + o.need + " con thì bầy rút lui; để lọt quá " + (o.leaders.length - o.need) + " con là thua.";
}

function hazardDetail(stage: Stage): string {
  if (stage.hazard === null) return "Không có hiểm họa.";
  return "Vết nứt: mỗi " + stage.hazard.period + " s, tường trái hoặc phải sáng cam " + String(RIFT.warn).replace(".", ",") + " s trước khi đổ bầy ra ở " + RIFT.zMin + "–" + RIFT.zMax + " m. Giữ một súng gần có băng lúc sắp nứt.";
}

function ruleDetail(stage: Stage): string {
  if (stage.learn === "missing") return "mỗi từ ẩn 1 chữ (từ 7 chữ trở lên: 2), không bao giờ là chữ đầu. IPA và nghĩa vẫn hiện. Gõ sai ô ẩn thì chữ đúng hiện ra.";
  return "từ và nghĩa trên bến, IPA và nghĩa trong khung học.";
}

export function renderJourney(journey: Journey): string {
  const stage = journey.stage;
  switch (journey.screen) {
    case "stages":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-stages">' +
        "<h1>HÀNH TRÌNH</h1>" +
        '<div class="sv-title-en">CHƯƠNG 1 · HÀNH LANG VC-7</div><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(journey.menu, " sv-stage-list") +
        '<p class="sv-note">Mỗi ải dùng bộ đồ của nó: số bến, cấp Rèn, giáp. Ải sau mở khi qua ải trước.</p>' +
        hints("<kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>Enter</kbd> xem ải · <kbd>Esc</kbd> quay lại") +
        "</div>"
      );
    case "briefing":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-brief">' +
        "<h1>ẢI " + stage.index + " · " + escapeHtml(stage.name.toUpperCase()) + "</h1>" +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<dl class="sv-brief-rules">' +
        "<dt>Mục tiêu</dt><dd><b>" + escapeHtml(objectiveText(stage)) + "</b> · " + escapeHtml(objectiveDetail(stage)) + "</dd>" +
        "<dt>Hiểm họa</dt><dd>" + escapeHtml(hazardDetail(stage)) + "</dd>" +
        "<dt>Luật học</dt><dd><b>" + escapeHtml(LEARN_RULES[stage.learn].label) + "</b> · " + escapeHtml(ruleDetail(stage)) + "</dd>" +
        "<dt>Bộ đồ</dt><dd>" + stage.kit.bays + " bến · Rèn " + stage.kit.levels.join("/") + " · giáp " + stage.kit.armour + "</dd>" +
        "</dl>" +
        '<ul class="sv-foes">' +
        foes(stage).map((foe) => "<li" + (foe.fresh ? ' class="is-new"' : "") + "><b>" + escapeHtml(foe.name) + "</b>" + (foe.fresh ? "<em>MỚI</em>" : "") + "<small>" + escapeHtml(foe.note) + "</small><span>" + escapeHtml(foe.tag) + "</span></li>").join("") +
        "</ul>" +
        (stage.teach.length > 0 ? '<p class="sv-note">Ải này dạy: ' + escapeHtml(stage.teach.map((thing) => NEW[thing] ?? thing).join(", ")) + ".</p>" : "") +
        menu(journey.menu, " sv-row") +
        hints("<kbd>Enter</kbd> nạp súng · <kbd>Esc</kbd> chọn ải") +
        "</div>"
      );
    case "loadout": {
      const cards = journey.cards();
      const threats = journey.threats();
      const bays = stage.kit.bays;
      return (
        '<div class="sv-card sv-panel sv-sheet sv-loadout">' +
        "<h1>NẠP SÚNG</h1>" +
        '<div class="sv-title-en">ẢI ' + stage.index + " · CHỌN " + bays + " TRONG 5 · " + journey.picked.length + "/" + bays + "</div>" +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-cards">' +
        cards
          .map(
            (card, n) =>
              '<section class="sv-gun-card sv-' + card.key + (card.on ? " is-on" : "") + (card.picked >= 0 ? " is-picked" : "") + '" data-card="' + n + '">' +
              '<header><kbd>' + (n + 1) + "</kbd><b>" + escapeHtml(card.name) + "</b>" + (card.picked >= 0 ? '<em>BẾN ' + (card.picked + 1) + (card.level > 1 ? " · RÈN " + card.level : "") + "</em>" : "") + "</header>" +
              "<small>" + escapeHtml(card.title) + "</small>" +
              "<p>" + escapeHtml(card.magazine) + " · tầm " + escapeHtml(card.range) + (card.heavy ? " · từ +1 chữ" : "") + "</p>" +
              '<p class="sv-good">khắc: ' + escapeHtml(card.good || "—") + "</p>" +
              '<p class="sv-poor">kém: ' + escapeHtml(card.poor || "—") + "</p>" +
              "</section>",
          )
          .join("") +
        "</div>" +
        '<div class="sv-threats"><b>Ải này gặp gì</b>' +
        threats.map((threat) => '<span class="' + (threat.covered ? "" : "is-open") + '" title="' + escapeHtml(threat.counters) + '">' + (threat.covered ? "" : "⚠ ") + escapeHtml(threat.label) + " · " + Math.round(threat.weight * 100) + "%</span>").join("") +
        "</div>" +
        '<div class="sv-start' + (journey.cursor === cards.length ? " is-on" : "") + (journey.ready ? "" : " is-off") + '" data-start="1">' +
        (journey.ready ? "BẮT ĐẦU · ĐỘ HỢP " + Math.round(journey.score() * 100) + "%" : "CHỌN THÊM " + (bays - journey.picked.length) + " SÚNG") +
        "</div>" +
        hints("<kbd>1</kbd>–<kbd>5</kbd> chọn hoặc bỏ · <kbd>←</kbd><kbd>→</kbd> di chuyển · <kbd>Enter</kbd> chọn · <kbd>Esc</kbd> bảng tin") +
        "</div>"
      );
    }
    default:
      return "";
  }
}

/** The result's star row (the end screen of a stage run). */
export function starRow(got: readonly boolean[], accuracyBar: number): string {
  const labels = ["Vượt ải", "Giáp còn ≥ 50 %", "Chính xác ≥ " + Math.round(accuracyBar * 100) + " %"];
  return '<ul class="sv-star-row">' + got.map((on, k) => '<li class="' + (on ? "is-on" : "") + '"><b>' + (on ? "★" : "☆") + "</b>" + escapeHtml(labels[k]!) + "</li>").join("") + "</ul>";
}
