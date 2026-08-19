// ── Save execution: persist-throws recovery contract ──
//
// Wraps a persistence call so that BOTH a `false` return AND a thrown exception
// route to the failure handler. This is the single place that guarantees the
// caller can never be left in a stuck "saving" state: the failure handler is
// responsible for releasing any guard (e.g. a `savingRef`), and it is invoked on
// every non-success path, including a throw.

export type SaveOutcome = 'success' | 'failure';

export async function executeSave(
  persist: () => Promise<boolean>,
  handlers: { onSuccess: () => void; onFailure: () => void },
): Promise<SaveOutcome> {
  try {
    const ok = await persist();
    if (ok) {
      handlers.onSuccess();
      return 'success';
    }
    handlers.onFailure();
    return 'failure';
  } catch (err) {
    console.error('[save] persist threw:', err);
    handlers.onFailure();
    return 'failure';
  }
}
