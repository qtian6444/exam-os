// Deno unit tests for the breakdown dedup key (ENG-R3-006).
// Run with:  deno test supabase/functions/breakdown/dedup_test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { dedupKey } from './dedup.ts';

Deno.test('dedupKey: same tuple → same key (deterministic reuse)', () => {
  assertEquals(dedupKey('u1', 'sentence', 'ctx'), dedupKey('u1', 'sentence', 'ctx'));
});

Deno.test('dedupKey: different tuples → different keys (no separator collision)', () => {
  // The old `a::b::c` concatenation collided across a `::` boundary:
  //   user "u1",      sentence "alpha", context "beta::gamma"
  // vs user "u1::alpha", sentence "beta", context "gamma"
  // vs user "u1",      sentence "alpha::beta", context "gamma"
  // All three produced the same string. JSON.stringify of a canonical tuple
  // cannot collide this way.
  const keys = new Set([
    dedupKey('u1', 'alpha', 'beta::gamma'),
    dedupKey('u1::alpha', 'beta', 'gamma'),
    dedupKey('u1', 'alpha::beta', 'gamma'),
    dedupKey('u1', 'alpha', 'beta'),
  ]);
  assertEquals(keys.size, 4);
});

Deno.test('dedupKey: no trim/lowercase/semantic normalization', () => {
  const exact = dedupKey('u1', ' Sentence ', 'Ctx');
  // The exact tuple reproduces the same key...
  assertEquals(exact, dedupKey('u1', ' Sentence ', 'Ctx'));
  // ...and a different tuple (case / whitespace preserved) is a different key.
  assertEquals(exact === dedupKey('u1', 'sentence', 'ctx'), false);
});
