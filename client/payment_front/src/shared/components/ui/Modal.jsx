import { useEffect } from 'react'
import { X } from 'lucide-react'

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />
        <div
          className={`
            relative bg-surface rounded-2xl shadow-xl w-full
            transform transition-all animate-scale-in
            ${sizeMap[size]}
            ${className}
          `}
        >
          {(title || showClose) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              {title && (
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              )}
              {showClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-alt transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-border ${className}`}>
      {children}
    </div>
  )
}

export default Modal
