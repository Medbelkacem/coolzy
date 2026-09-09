/**
 * Merges messages/{locale}/*.json into src/generated/messages/{locale}.json and
 * fails the build if en or ar is missing (or has extra) keys vs fr, or if any
 * value is empty. No silent fallbacks, ever.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Tree = { [k: string]: string | Tree };
const root = join(process.cwd(), "messages");
const outDir = join(process.cwd(), "src", "generated", "messages");
const locales = ["fr", "en", "ar"] as const;

function loadLocale(locale: string): Tree {
  const dir = join(root, locale);
  const tree: Tree = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const ns = file.replace(/\.json$/, "");
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as Tree;
    if (Object.keys(parsed).length > 0) tree[ns] = parsed;
  }
  return tree;
}

function flatten(t: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(t)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else for (const [ck, cv] of flatten(v, key)) out.set(ck, cv);
  }
  return out;
}

const trees = Object.fromEntries(locales.map((l) => [l, loadLocale(l)])) as Record<(typeof locales)[number], Tree>;
const fr = flatten(trees.fr);
let failed = false;
for (const [key, value] of fr) {
  if (!value.trim()) {
    console.error(`fr: empty value at "${key}"`);
    failed = true;
  }
}
for (const locale of ["en", "ar"] as const) {
  const other = flatten(trees[locale]);
  for (const key of fr.keys()) {
    if (!other.has(key)) {
      console.error(`${locale}: missing key "${key}"`);
      failed = true;
    } else if (!other.get(key)!.trim()) {
      console.error(`${locale}: empty value at "${key}"`);
      failed = true;
    }
  }
  for (const key of other.keys()) {
    if (!fr.has(key)) {
      console.error(`${locale}: extra key "${key}" not present in fr`);
      failed = true;
    }
  }
}
if (failed) {
  console.error("\nMessage files are out of sync. Fix before building.");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
for (const l of locales) writeFileSync(join(outDir, `${l}.json`), JSON.stringify(trees[l], null, 2) + "\n");
console.log(`messages ok — ${fr.size} keys × 3 locales → src/generated/messages`);
