/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useCallback, useMemo } from 'react';

const CacheContext = createContext(null);

const DEFAULT_TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

export function CacheProvider({ children }) {
  const cacheRef = useRef(new Map());

  const get = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      cacheRef.current.delete(key);
      return null;
    }
    return entry.value;
  }, []);

  const set = useCallback((key, value, ttl = DEFAULT_TTL) => {
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey !== undefined) cacheRef.current.delete(firstKey);
    }
    cacheRef.current.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }, []);

  const remove = useCallback((key) => {
    cacheRef.current.delete(key);
  }, []);

  const removeByPrefix = useCallback((prefix) => {
    const keysToDelete = [];
    for (const key of cacheRef.current.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => cacheRef.current.delete(key));
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const has = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      cacheRef.current.delete(key);
      return false;
    }
    return true;
  }, []);

  const value = useMemo(() => ({ get, set, remove, removeByPrefix, clear, has }), [get, set, remove, removeByPrefix, clear, has]);

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}
