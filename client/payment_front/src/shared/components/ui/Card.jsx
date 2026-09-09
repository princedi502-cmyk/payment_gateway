function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  bordered = true,
  onClick,
  ...props
}) {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={`
        bg-surface rounded-xl
        ${bordered ? 'border border-border' : ''}
        ${hover ? 'hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer hover:-translate-y-0.5' : 'shadow-xs'}
        ${paddingMap[padding]}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-text-muted mt-1 ${className}`}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-border flex items-center ${className}`}>
      {children}
    </div>
  )
}

export default Card
