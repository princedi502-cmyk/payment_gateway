import { useState, useEffect, useRef } from 'react'
import { fetchProducts } from '../../../shared/utils/api.js'
import ProductGrid from '../components/ProductGrid.jsx'

function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      try {
        const data = await fetchProducts()
        setProducts(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-danger text-lg">Error: {error}</p>
        <p className="text-slate-500 mt-2">Make sure the backend server is running on localhost:5000</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Products</h1>
        <p className="text-slate-500">
          Browse our collection and practice your payment integration skills.
        </p>
      </div>
      <ProductGrid products={products} loading={loading} />
    </div>
  )
}

export default Home
