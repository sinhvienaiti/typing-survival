import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ADVICE_EN } from "../src/app/english";
import { fallbackVocab } from "../src/app/vocab";
import { SHIP } from "../src/kit/feedback";
import { FEEL } from "../src/view/gun-rules";

const ROOT = new URL("../", import.meta.url);
const letters = (text: string): string => text.normalize("NFC").replace(/[^\p{L}\p{M}]/gu, "");
const hasVietnamese = (text: string): boolean => /[À-ỹđĐ]/u.test(letters(text));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "kit" ? [] : sources(path);
    return /\.(?:[cm]?[jt]sx?|css)$/.test(entry.name) ? [path] : [];
  });
}

function problems(file: string, source: string): string[] {
  if (file.endsWith(".css")) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
    return [...code.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g)]
      .filter((match) => hasVietnamese(match[0]))
      .map((match) => file + " " + match[0]);
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      // Only the fallback meanings are exempt, not the entire vocabulary file.
      const meanings = file === "src/app/vocab.ts" && ts.isVariableDeclaration(node.parent) && node.parent.name.getText(ast) === "FALLBACK";
      // The only embedded Vietnamese comment is in this GLSL fragment.
      const text = file === "src/view/crowd.ts" && node.text.includes("#include <emissivemap_fragment>") ? node.text.replace(/\/\/[^\n]*/g, "") : node.text;
      if (!meanings && hasVietnamese(text)) found.push(file + ":" + (ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1) + " " + node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}

describe("English player text (ticket 130)", () => {
  it("has no Vietnamese literals outside kit and vocabulary meanings", () => {
    const root = new URL("src/", ROOT).pathname;
    const found = sources(root).flatMap((file) => problems("src/" + relative(root, file), readFileSync(file, "utf8")));
    expect(found).toEqual([]);
  });

  it("checks template spans, nested literals and decomposed accents, and ignores comments and multiplication", () => {
    expect(problems("src/app/probe.ts", '// Bắt đầu\nconst label = "Start"; const n = "×";')).toEqual([]);
    for (const source of ['const label = "Bắt đầu";', 'const label = `Start ${n} để mở`;', 'const label = `Start ${"Bắt đầu"}`;', 'const label = "Bắt đầu";']) {
      expect(problems("src/app/probe.ts", source).length).toBeGreaterThan(0);
    }
    expect(problems("src/view/probe.css", '/* Bắt đầu */ .hint::after { content: "Bắt đầu"; }')).toHaveLength(1);
    expect(problems("src/app/vocab.ts", 'const label = "Bắt đầu";')).toHaveLength(1);
  });

  it("keeps the page English, advice and feedback English, and preserves word meanings", () => {
    const html = readFileSync(new URL("index.html", ROOT), "utf8");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Last Line</title>");
    expect(hasVietnamese(html)).toBe(false);
    expect(Object.keys(ADVICE_EN)).toHaveLength(7);
    expect(Object.values(ADVICE_EN).every((text) => !hasVietnamese(text))).toBe(true);
    expect(FEEL.numbers.label).toBe("PERFECT");
    expect(fallbackVocab().words.get("good")?.vi).toBe("tốt");
  });

  it("preserves all seven advice sentences from before the kit update", () => {
    expect(ADVICE_EN).toEqual({
      rest: "Your hands are slowing down. Take a few minutes to rest.",
      "slow-down": "You type fast but make mistakes. Slow down for more perfect words.",
      accuracy: "Focus on each letter first. Speed will follow.",
      steady: "Keep a steady, comfortable pace for every word.",
      "new-words": "Read new words' meanings and listen before typing.",
      crowd: "When foes crowd in, finish one word before switching.",
      "keep-going": "You are making steady progress. Keep it up!",
    });
  });

  it("inherits the kit's English number settings", () => {
    expect(SHIP.numbers.label).toBe("PERFECT");
    expect(FEEL.numbers).toBe(SHIP.numbers);
  });
});
