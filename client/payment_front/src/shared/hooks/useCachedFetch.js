import { useState, useEffect, useCallback } from 'react';
import { useCache } from '../context/CacheContext.jsx';

/**
 * In-memory cached fetch hook.
 *
 * By default this is a pure cache read: the first mount of a component (within
 * the session TTL) performs a single network request, and subsequent mounts of
 * the same component read straight from the cache with no re-fetch. The data
 * is considered fresh for `ttl` ms (default 30 min, see DEFAULT_TTL in
 * CacheContext).
 *
 * `staleWhileRevalidate` defaults to `false`. When enabled it still returns the
 * cached value instantly, but also fires a background refresh on every mount.
 * Only opt into this for data the caller explicitly wants refreshed on every
 * visit; leave it off for the vast majority of call sites so SPA navigation
 * no longer triggers duplicate requests.
 *
 * @param {string} key - unique cache key
 * @param {() => Promise<any>} fetchFn - function that returns the data to cache
 * @param {object} options
 * @param {number} [options.ttl=30*60*1000] - time-to-live in ms
 * @param {boolean} [options.enabled=true] - whether to fetch at all
 * @param {boolean} [options.staleWhileRevalidate=false] - revalidate in background even when fresh
 */
export function useCachedFetch(key, fetchFn, options = {}) {
  const { ttl = 30 * 60 * 1000, enabled = true, staleWhileRevalidate = false } = options;
  const { get, set, has } = useCache();

  const [data, setData] = useState(() => {
    if (!enabled) return undefined;
    const cached = get(key);
    return cached !== null ? cached : undefined;
  });
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false;
    return !has(key);
  });
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    const cached = get(key);
    if (!force && cached != null) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    if (staleWhileRevalidate && cached != null) {
      setData(cached);
      setIsStale(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchFn();
      set(key, result, ttl);
      setData(result);
      setIsStale(false);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, enabled, staleWhileRevalidate, get, set]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    invalidate,
    refetch: invalidate,
  };
}
