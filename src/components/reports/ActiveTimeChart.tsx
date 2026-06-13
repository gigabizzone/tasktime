import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SeriesDatum } from '../../lib/reports'
import { formatMinutes } from '../../lib/format'
import type { Category } from '../../types/models'

interface Props {
  series: SeriesDatum[]
  categories: Category[]
}

/** F-4.2: active minutes per bucket, stacked by category color. */
export function ActiveTimeChart({ series, categories }: Props) {
  // One flat row per bucket: { label, <categoryId>: minutes, ... }
  const data = series.map((d) => ({ label: d.label, ...d.byCategory }))
  const present = categories.filter((c) => series.some((d) => (d.byCategory[c.id] ?? 0) > 0))
  const hasData = series.some((d) => d.total > 0)
  const tick = Math.ceil(series.length / 12)

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-800">
        No focus time recorded in this range yet.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            dataKey="label"
            interval={tick > 1 ? tick - 1 : 0}
            tick={{ fontSize: 11 }}
            className="fill-gray-500"
          />
          <YAxis tick={{ fontSize: 11 }} className="fill-gray-500" width={40} />
          <Tooltip
            formatter={(value, name) => [
              formatMinutes(Number(value)),
              categories.find((c) => c.id === String(name))?.name ?? String(name),
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {present.map((c) => (
            <Bar key={c.id} dataKey={c.id} stackId="cat" fill={c.color} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
