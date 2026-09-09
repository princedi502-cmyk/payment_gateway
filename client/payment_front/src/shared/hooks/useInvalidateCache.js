import { useCallback } from 'react';
import { useCache } from '../context/CacheContext.jsx';

/**
 * Convenience wrapper around the cache's `remove` / `removeByPrefix` methods so
 * call sites can invalidate cached data right after a mutation succeeds, e.g.:
 *
 *   const { invalidateKeys, invalidatePrefix } = useInvalidateCache();
 *   invalidatePrefix('order:');
 *   invalidateKeys('dashboard:recent-orders');
 *
 * @returns {{ invalidateKeys: (...keys: string[]) => void, invalidatePrefix: (prefix: string) => void }}
 */
export function useInvalidateCache() {
  const { remove, removeByPrefix } = useCache();

  const invalidateKeys = useCallback(
    (...keys) => {
      keys.forEach((key) => remove(key));
    },
    [remove]
  );

  const invalidatePrefix = useCallback(
    (prefix) => {
      removeByPrefix(prefix);
    },
    [removeByPrefix]
  );

  return { invalidateKeys, invalidatePrefix };
}
