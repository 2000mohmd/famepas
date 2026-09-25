function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Flags names within edit-distance 2 of another (catches misspelled duplicates
 * like "Ivana Rebeiz" / "Ivana Reveiz" that a phone-number match would miss).
 * O(n^2) — fine at hundreds of rows; revisit if the creator list hits the thousands.
 */
export function findNameDuplicateIds(people: { id: string; name: string | null }[]): Set<string> {
  const dupes = new Set<string>();
  const candidates = people
    .map((p) => ({ id: p.id, name: normalizeName(p.name || "") }))
    .filter((p) => p.name.length >= 4);
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (levenshtein(candidates[i].name, candidates[j].name) <= 2) {
        dupes.add(candidates[i].id);
        dupes.add(candidates[j].id);
      }
    }
  }
  return dupes;
}
