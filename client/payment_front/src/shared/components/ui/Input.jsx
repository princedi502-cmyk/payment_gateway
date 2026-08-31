function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  name,
  required = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor={name}>
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          error
            ? 'border-danger focus:border-danger'
            : 'border-slate-300 focus:border-primary'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

export default Input
