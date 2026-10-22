/**
 * Source checks for Sinh Tồn's boundary (tests/survival-boundary.test.ts),
 * the same rules Typing Defense's rules obey (its td-boundary test):
 * imports read without a parser, banned names found outside comments and
 * strings, and host globals found by compiling without the DOM and Node.
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { blank } from "./blank";

export const ROOT = join(__dirname, "..", "..");
export type Source = { path: string; text: string };

/** Every import's target as a repo path without extension ("src/platform/rng"), packages as written. */
export function importTargets(source: Source): string[] {
  const code = blank(source.text, false);
  const specs = [
    ...[...code.matchAll(/\b(?:import|export)\s+(?!["'(])[^"';()=]*?\s*from\s*["']([^"']+)["']/g)].map((match) => match[1]!),
    ...[...code.matchAll(/\bimport\s*["']([^"']+)["']/g)].map((match) => match[1]!),
    ...[...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]!),
  ];
  return specs.map((spec) => (spec.startsWith(".") ? relative(ROOT, resolve(ROOT, dirname(source.path), spec)).split(sep).join("/").replace(/\.(ts|js|mjs)$/, "") : spec));
}

const FORBIDDEN_GLOBALS = [
  "window", "self", "document", "performance", "Date", "localStorage", "sessionStorage", "requestAnimationFrame",
  "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "structuredClone", "globalThis", "navigator", "crypto",
  "process", "require", "Intl", "eval", "Function", "WeakRef", "FinalizationRegistry",
];
const FORBIDDEN_METHODS = ["localeCompare", "toLocaleString", "toLocaleUpperCase", "toLocaleLowerCase", "toLocaleDateString", "toLocaleTimeString"];
const ALLOWED_MATH = ["sqrt", "floor", "ceil", "round", "trunc", "abs", "min", "max", "sign", "imul", "clz32"];

/** Clocks, host globals, locale methods, Math.random, trigonometry and powers in code (not comments or strings). */
export function purityProblems(text: string): string[] {
  const code = blank(text, true);
  const problems: string[] = [];
  const globals = new RegExp("(?<![\\w$.])(" + FORBIDDEN_GLOBALS.join("|") + ")(?![\\w$])|(?<![\\w$])(" + FORBIDDEN_METHODS.join("|") + ")(?![\\w$])", "g");
  for (const match of code.matchAll(globals)) problems.push(match[1] ?? match[2]!);
  const math = new RegExp("\\bMath\\b(?!\\s*\\.\\s*(?:" + ALLOWED_MATH.join("|") + ")\\b)(\\s*\\.\\s*\\w+)?", "g");
  for (const match of code.matchAll(math)) problems.push(match[0].replace(/\s/g, ""));
  if (code.includes("**")) problems.push("**");
  return problems;
}

const configured = ts.parseJsonConfigFileContent(ts.readConfigFile(join(ROOT, "tsconfig.json"), ts.sys.readFile).config, ts.sys, ROOT).options;
const HOSTLESS: ts.CompilerOptions = { ...configured, lib: (configured.lib ?? []).filter((lib) => !/dom|webworker|scripthost/i.test(lib)), types: [], noEmit: true };

/** Compiles `files` without the DOM and Node libraries: a host global fails as an undeclared name. */
export function hostProblems(files: readonly Source[]): string[] {
  const own = new Map(files.map((file) => [join(ROOT, file.path), file]));
  const host = ts.createCompilerHost(HOSTLESS);
  const read = host.getSourceFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.fileExists = (name) => own.has(name) || exists(name);
  host.getSourceFile = (name, language, ...rest) => {
    const file = own.get(name);
    return file !== undefined ? ts.createSourceFile(name, file.text, language) : read(name, language, ...rest);
  };
  const program = ts.createProgram({ rootNames: [...own.keys()], options: HOSTLESS, host });
  return [...own].flatMap(([name, file]) => {
    const source = program.getSourceFile(name)!;
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)].map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
      const start = diagnostic.start ?? 0;
      return file.path + ": " + (message.startsWith("Cannot find name") ? source.text.slice(start, start + (diagnostic.length ?? 0)) : message);
    });
  });
}

export const read = (path: string): Source => ({ path, text: readFileSync(join(ROOT, path), "utf8") });
