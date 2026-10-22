// Source: games/space-typing/tests/td/source-scan.ts (blank only)
/**
 * Reading source text for the boundary checks without a parser: comments
 * and string contents are blanked in place, so a pattern never matches
 * inside them and every offset still points into the original text.
 */

/**
 * Blanks comments and, with `strings`, what string and template literals
 * hold (not a template's `${…}` code), keeping every offset and line break.
 */
export function blank(text: string, strings: boolean): string {
  const out = text.split("");
  const hide = (from: number, to: number) => {
    for (let index = from; index < to; index += 1) if (out[index] !== "\n") out[index] = " ";
  };
  const open: number[] = [];
  let inTemplate = false;
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    const next = text[index + 1];
    if (inTemplate) {
      if (char === "`") inTemplate = false;
      else if (char === "$" && next === "{") {
        open.push(0);
        inTemplate = false;
        index += 2;
        continue;
      } else if (strings) hide(index, char === "\\" ? index + 2 : index + 1);
      index += char === "\\" ? 2 : 1;
      continue;
    }
    if (char === "/" && (next === "/" || next === "*")) {
      const end = next === "/" ? text.indexOf("\n", index) : text.indexOf("*/", index + 2);
      const stop = end < 0 ? text.length : next === "/" ? end : end + 2;
      hide(index, stop);
      index = stop;
      continue;
    }
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < text.length && text[end] !== char && text[end] !== "\n") end += text[end] === "\\" ? 2 : 1;
      if (strings) hide(index + 1, end);
      index = end + 1;
      continue;
    }
    if (char === "`") inTemplate = true;
    else if (open.length > 0 && char === "{") open[open.length - 1]! += 1;
    else if (open.length > 0 && char === "}") {
      if (open[open.length - 1] === 0) {
        open.pop();
        inTemplate = true;
      } else open[open.length - 1]! -= 1;
    }
    index += 1;
  }
  return out.join("");
}
