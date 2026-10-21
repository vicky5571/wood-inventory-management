/**
 * Normalizes unknown error values into a user-facing string.
 * Prefer this over `err.message` on `any`-typed catches.
 */
export function extractErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}
