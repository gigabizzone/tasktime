import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { CategoryTotal } from '../../lib/reports'
import { formatMinutes } from '../../lib/format'
import type { Category, ID } from '../../types/models'

interface Props {
  totals: CategoryTotal[]
  categories: Category[]
  selected: ID | null
  onSelect: (id: ID | null) => void
}

/** F-4.3: donut of active time per category; click a slice to filter the detail list. */
export function CategoryDonut({ totals, categories, selected, onSelect }: Props) {
  const grand = totals.reduce((sum, t) => sum + t.minutes, 0)
  const nameOf = (id: ID) => categories.find((c) => c.id === id)?.name ?? '—'
  const colorOf = (id: ID) => categories.find((c) => c.id === id)?.color ?? '#6B7280'

  if (grand === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
    )
  }

  const data = totals.map((t) => ({ ...t, name: nameOf(t.categoryId) }))

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              onClick={(_, i) => {
                const id = totals[i].categoryId
                onSelect(selected === id ? null : id)
              }}
            >
              {data.map((t) => (
                <Cell
                  key={t.categoryId}
                  fill={colorOf(t.categoryId)}
                  opacity={selected && selected !== t.categoryId ? 0.3 : 1}
                  className="cursor-pointer outline-none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold">{formatMinutes(grand)}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1 text-sm">
        {totals.map((t) => {
          const pct = Math.round((t.minutes / grand) * 100)
          const active = selected === t.categoryId
          return (
            <li key={t.categoryId}>
              <button
                onClick={() => onSelect(active ? null : t.categoryId)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
                  active ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                } ${selected && !active ? 'opacity-50' : ''}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(t.categoryId) }} />
                <span className="min-w-0 flex-1 truncate">{nameOf(t.categoryId)}</span>
                <span className="tabular-nums text-gray-500">{formatMinutes(t.minutes)}</span>
                <span className="w-9 text-right tabular-nums text-xs text-gray-400">{pct}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
