import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeSave } from './saveExecutor';

describe('executeSave (persist-throws recovery, ENG-R3-005)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onFailure (and never onSuccess) when persist throws', async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const result = await executeSave(() => Promise.reject(new Error('boom')), {
      onSuccess,
      onFailure,
    });
    expect(result).toBe('failure');
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onFailure when persist returns false', async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const result = await executeSave(() => Promise.resolve(false), {
      onSuccess,
      onFailure,
    });
    expect(result).toBe('failure');
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onSuccess when persist returns true', async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const result = await executeSave(() => Promise.resolve(true), {
      onSuccess,
      onFailure,
    });
    expect(result).toBe('success');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('still settles (never rejects) when persist throws — no stuck state', async () => {
    // A throw is swallowed into a 'failure' outcome, so a caller using this
    // wrapper cannot be left awaiting a rejected promise forever.
    await expect(
      executeSave(() => Promise.reject(new Error('boom')), {
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
      }),
    ).resolves.toBe('failure');
  });
});
