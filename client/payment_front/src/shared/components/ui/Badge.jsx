function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantMap = {
    primary: 'bg-primary-50 text-primary border-primary-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-success/10 text-success border-success/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    warning: 'bg-accent/10 text-accent border-accent/20',
    info: 'bg-info/10 text-blue-700 border-info/20',
    outline: 'bg-transparent text-text-secondary border-border',
  }

  const dotColorMap = {
    primary: 'bg-primary',
    secondary: 'bg-slate-500',
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-accent',
    info: 'bg-info',
    outline: 'bg-text-muted',
  }

  const sizeMap = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[variant]}`} />
      )}
      {children}
    </span>
  )
}

export default Badge
