// Canonical dedup key for the breakdown single-flight / success cache.
//
// Lives in its own module (no Deno `serve` import) so it is unit-testable in
// isolation without starting the HTTP server.

export function dedupKey(userId: string, sentence: string, context: string): string {
  // Unambiguous encoding: JSON.stringify of a canonical tuple cannot collide via
  // separator ambiguity (unlike `a::b::c`, where "a::b" + "::" + "c" and
  // "a" + "::" + "b::c" map to the same string). It does NOT trim, lowercase, or
  // semantically normalize any input — the exact tuple is the key.
  return JSON.stringify([userId, sentence, context]);
}
