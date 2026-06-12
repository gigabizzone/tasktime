import { useState } from 'react'
import { parseQuickAdd, matchCategory } from '../../lib/quickAdd'
import { useTaskStore } from '../../stores/useTaskStore'
import type { Category } from '../../types/models'

/**
 * F-1.1 quick add: title + Enter creates a task for today (category Others).
 * Tokens: '#business' category, '~3' estimate. '@date' is captured by the
 * parser but only acted on from M4 (command bar / scheduling).
 */
export function QuickAdd({ categories }: { categories: Category[] }) {
  const addTask = useTaskStore((s) => s.addTask)
  const [value, setValue] = useState('')

  const submit = () => {
    const parsed = parseQuickAdd(value)
    if (!parsed.title) return
    const category =
      (parsed.categoryToken && matchCategory(parsed.categoryToken, categories)) ||
      categories.find((c) => c.name === 'Others') ||
      categories[0]
    if (!category) return
    void addTask({
      title: parsed.title,
      categoryId: category.id,
      estimatePomos: parsed.estimatePomos,
    })
    setValue('')
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && submit()}
      placeholder="+ Add a task — try: Send proposal #business ~2"
      aria-label="Quick add task"
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900"
    />
  )
}
