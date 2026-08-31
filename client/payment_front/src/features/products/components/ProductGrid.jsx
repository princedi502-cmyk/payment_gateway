import ProductCard from './ProductCard.jsx'

function ProductGrid({ products, loading, emptyMessage = 'No products found' }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="aspect-4/3 bg-slate-200" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="flex justify-between">
                <div className="h-6 bg-slate-200 rounded w-1/4" />
                <div className="h-8 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  )
}

export default ProductGrid
