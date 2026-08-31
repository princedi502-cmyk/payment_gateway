import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, ShoppingCart, Truck, Shield } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Badge from '../../../shared/components/ui/Badge.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { fetchProductById } from '../../../shared/utils/api.js'
import noImage from '../../../assets/no-image.svg'

function ProductDetailsPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()
  const navigate = useNavigate()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      try {
        const data = await fetchProductById(id)
        setProduct(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const timeoutRef = useRef(null)

  const handleAddToCart = useCallback(() => {
    if (product) {
      addItem(product)
      setAdded(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAdded(false), 2000)
    }
  }, [product, addItem])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-10 bg-slate-200 rounded w-3/4" />
              <div className="h-6 bg-slate-200 rounded w-1/4" />
              <div className="h-24 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-danger text-lg">Error: {error}</p>
        <Link to="/">
          <Button variant="primary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  if (!product) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/"
        className="inline-flex items-center text-slate-600 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <img
            src={product.image || noImage}
            alt={product.title}
            className="w-full h-full object-cover aspect-square"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = noImage
            }}
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-4">
            <Badge variant="primary">{product.category}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.title}</h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-700">{product.rating}</span>
            </div>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">{product.reviews} reviews</span>
          </div>

          <p className="text-slate-600 text-lg mb-8 leading-relaxed">{product.description}</p>

          <div className="mb-8">
            <span className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</span>
          </div>

          <div className="flex gap-4 mb-8">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
            >
              {added ? 'Added to Cart!' : <><ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart</>}
            </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  addItem(product)
                  navigate('/checkout')
                }}
              >
                Buy Now
              </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Truck className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-slate-900">Free Shipping</p>
                <p className="text-sm text-slate-500">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-slate-900">Secure Payment</p>
                <p className="text-sm text-slate-500">SSL encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailsPage
