function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  className = '',
}) {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name) => {
    const colors = [
      'bg-primary text-white',
      'bg-accent text-white',
      'bg-success text-white',
      'bg-info text-white',
      'bg-danger text-white',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`rounded-full object-cover ${sizeMap[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-semibold
        ${sizeMap[size]}
        ${getAvatarColor(name)}
        ${className}
      `}
    >
      {name ? getInitials(name) : '?'}
    </div>
  )
}

export default Avatar
