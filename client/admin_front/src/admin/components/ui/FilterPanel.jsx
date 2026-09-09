export default function FilterPanel({ children }) {
  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {children}
      </div>
    </div>
  );
}
