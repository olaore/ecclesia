/**
 * Build a JSON diff of changed fields between an existing record and incoming updates.
 *
 * Handles Date comparison by value (via getTime()), not by reference.
 * Without this, two Date objects with the same timestamp would appear as
 * "changed" since `new Date(x) !== new Date(x)` is always true in JS.
 */
export function buildAuditDiff(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const [key, newVal] of Object.entries(updates)) {
    const oldVal = existing[key];

    if (!valuesEqual(oldVal, newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return diff;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  // Date-safe comparison: compare by timestamp
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Strict equality for everything else
  return a === b;
}
