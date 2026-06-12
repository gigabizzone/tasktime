import type { Category, ID } from '../../types/models'

interface Props {
  categories: Category[]
  active: ID | null // null = All
  onChange: (id: ID | null) => void
}

export function FilterChips({ categories, active, onChange }: Props) {
  const base =
    'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors cursor-pointer'
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks by category">
      <button
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className={`${base} ${
          active === null
            ? 'border-gray-800 bg-gray-800 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900'
            : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(active === c.id ? null : c.id)}
          aria-pressed={active === c.id}
          className={`${base} ${
            active === c.id
              ? 'border-transparent text-white'
              : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
          }`}
          style={active === c.id ? { backgroundColor: c.color } : undefined}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: active === c.id ? 'white' : c.color }}
          />
          {c.name}
        </button>
      ))}
    </div>
  )
}
