const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Strip diacritics, parentheses, noise; lowercase alphanumerics only. */
export function normalizeForImageMatch(raw: string): string {
  let s = raw.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\[[^\]]*\]/g, " ");
  s = s.replace(/đ/gi, "d");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]/g, "");
  return s;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

const FUZZY_RATIO_MAX = 0.28;
const MIN_SUB_LEN = 6;

/**
 * Pick best `/products/<file>` for a product name from filesystem filenames (basename only).
 */
export function resolveProductImagePath(productName: string, filenames: string[]): string | null {
  const explicit = productName.trim();
  if (!explicit) return null;

  const target = normalizeForImageMatch(explicit);
  if (!target) return null;

  const entries = filenames
    .filter((f) => !f.startsWith(".") && IMAGE_EXT.test(f))
    .map((file) => {
      const stem = file.replace(/\.[^.]+$/, "");
      return { file, key: normalizeForImageMatch(stem) };
    })
    .filter((e) => e.key.length > 0);

  const exact = entries.find((e) => e.key === target);
  if (exact) return `/products/${encodeURIComponent(exact.file)}`;

  let bestFuzzy: { ratio: number; file: string; keyLen: number } | null = null;
  for (const e of entries) {
    const d = levenshtein(target, e.key);
    const ratio = d / Math.max(target.length, e.key.length, 1);
    if (ratio > FUZZY_RATIO_MAX) continue;
    if (
      !bestFuzzy ||
      ratio < bestFuzzy.ratio ||
      (Math.abs(ratio - bestFuzzy.ratio) < 1e-9 && e.key.length > bestFuzzy.keyLen)
    ) {
      bestFuzzy = { ratio, file: e.file, keyLen: e.key.length };
    }
  }
  if (bestFuzzy) return `/products/${encodeURIComponent(bestFuzzy.file)}`;

  let bestSub: { file: string; len: number } | null = null;
  for (const e of entries) {
    if (e.key.length < MIN_SUB_LEN && target.length < MIN_SUB_LEN) continue;
    if (target.includes(e.key) || e.key.includes(target)) {
      const len = Math.min(target.length, e.key.length);
      if (!bestSub || len > bestSub.len) bestSub = { file: e.file, len };
    }
  }
  if (bestSub) return `/products/${encodeURIComponent(bestSub.file)}`;

  return null;
}
