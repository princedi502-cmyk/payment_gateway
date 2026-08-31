/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { fetchWishlist, addToWishlist, removeFromWishlist } from '../api.js'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('wishlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(items))
  }, [items])

  const fetchWishlistItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchWishlist()
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWishlistItems()
  }, [fetchWishlistItems])

  const addItem = useCallback(async (product) => {
    try {
      const data = await addToWishlist(product._id)
      setItems((prev) => {
        const exists = prev.some((item) => item._id === data._id)
        if (exists) return prev
        return [...prev, data]
      })
    } catch (error) {
      if (error.status === 409) {
        return
      }
      throw error
    }
  }, [])

  const removeItem = useCallback(async (productId) => {
    try {
      await removeFromWishlist(productId)
      setItems((prev) => prev.filter((item) => item.product._id !== productId))
    } catch {
      throw new Error('Failed to remove from wishlist')
    }
  }, [])

  const isInWishlist = useCallback(
    (productId) => {
      return items.some((item) => item.product._id === productId)
    },
    [items]
  )

  const toggleWishlist = useCallback(
    async (product) => {
      if (isInWishlist(product._id)) {
        await removeItem(product._id)
      } else {
        await addItem(product)
      }
    },
    [isInWishlist, removeItem, addItem]
  )

  const totalItems = items.length

  const value = useMemo(
    () => ({
      items,
      loading,
      addItem,
      removeItem,
      toggleWishlist,
      isInWishlist,
      fetchWishlistItems,
      totalItems,
    }),
    [items, loading, addItem, removeItem, toggleWishlist, isInWishlist, fetchWishlistItems, totalItems]
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
