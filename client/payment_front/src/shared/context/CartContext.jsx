import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item._id === product._id)
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item._id !== id))
  }, [])

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item._id !== id))
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )

  const value = useMemo(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
