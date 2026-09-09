import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-sm ${className}`}>
      <Link
        to="/"
        className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-text-muted" />
          {item.href ? (
            <Link
              to={item.href}
              className="text-text-muted hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
