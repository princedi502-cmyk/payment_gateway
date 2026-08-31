function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${padding ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export default Card
