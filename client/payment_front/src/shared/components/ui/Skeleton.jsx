function Skeleton({ className = '', variant = 'text', width, height }) {
  const variantMap = {
    text: 'h-4 rounded',
    heading: 'h-8 rounded w-3/4',
    avatar: 'rounded-full',
    image: 'rounded-xl aspect-4/3',
    card: 'rounded-xl h-48',
    button: 'h-10 rounded-xl w-24',
  }

  return (
    <div
      className={`skeleton ${variantMap[variant]} ${className}`}
      style={{ width, height }}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <Skeleton variant="image" className="w-full" />
      <div className="p-4 space-y-3">
        <Skeleton variant="heading" className="w-3/4" />
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant="text" className="w-20 h-6" />
          <Skeleton variant="button" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="flex-1" />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="avatar" className="w-12 h-12" />
      </div>
      <Skeleton variant="heading" className="w-32 mt-4" />
      <Skeleton variant="text" className="w-20 mt-2" />
    </div>
  )
}

export default Skeleton
