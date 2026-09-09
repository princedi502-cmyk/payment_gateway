import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { getOrders, getUserStats } from '../../../shared/utils/authApi.js'
import { useAuth } from '../../../shared/context/useAuth.js'

const OrdersContext = createContext(null)

const PAGE_LIMIT = 10
const RECENT_LIMIT = 5

export function OrdersProvider({ children }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0 })
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({ totalPaidOrders: 0, totalPaidSpent: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    getOrders(1, PAGE_LIMIT)
      .then((response) => {
        if (cancelled) return
        const data = response?.data || []
        const paginationData = response?.pagination || { page: 1, limit: PAGE_LIMIT, total: data.length }
        setOrders(data)
        setPagination(paginationData)
      })
      .catch(() => {
        if (cancelled) return
        setOrders([])
        setPagination({ page: 1, limit: PAGE_LIMIT, total: 0 })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatsLoading(true)

    getUserStats()
      .then((response) => {
        if (cancelled) return
        const data = response?.data || { totalPaidOrders: 0, totalPaidSpent: 0 }
        setUserStats(data)
      })
      .catch(() => {
        if (cancelled) return
        setUserStats({ totalPaidOrders: 0, totalPaidSpent: 0 })
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  const recentOrders = useMemo(() => orders.slice(0, RECENT_LIMIT), [orders])

  const invalidate = useCallback(() => {
    if (!user) return

    setLoading(true)
    getOrders(1, PAGE_LIMIT)
      .then((response) => {
        const data = response?.data || []
        setOrders(data)
        setPagination(response?.pagination || { page: 1, limit: PAGE_LIMIT, total: data.length })
      })
      .catch(() => {
        // Preserve existing orders on network error
      })
      .finally(() => setLoading(false))
  }, [user])

  const prependOrder = useCallback((order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o._id === order._id)
      if (exists) return prev
      return [order, ...prev]
    })
  }, [])

  const appendPage = useCallback((pageData) => {
    setOrders((prev) => [...prev, ...pageData])
  }, [])

  const value = useMemo(
    () => ({
      orders,
      pagination,
      recentOrders,
      userStats,
      statsLoading,
      loading,
      invalidate,
      prependOrder,
      appendPage,
    }),
    [orders, pagination, recentOrders, userStats, statsLoading, loading, invalidate, prependOrder, appendPage]
  )

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) throw new Error('useOrders must be used within OrdersProvider')
  return context
}
