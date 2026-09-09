import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) {
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {getPageNumbers().map((page, index) => (
        <span key={index}>
          {page === '...' ? (
            <span className="px-2 py-2 text-text-muted">
              <MoreHorizontal className="w-5 h-5" />
            </span>
          ) : (
            <button
              onClick={() => onPageChange(page)}
              className={`
                min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors
                ${currentPage === page
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-primary-50 hover:text-primary'
                }
              `}
            >
              {page}
            </button>
          )}
        </span>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </nav>
  )
}

export default Pagination
