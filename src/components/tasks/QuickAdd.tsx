import { useState } from 'react'
import { parseQuickAdd, matchCategory } from '../../lib/quickAdd'
import { parseNaturalDate, formatScheduleLabel } from '../../lib/naturalDate'
import { useTaskStore } from '../../stores/useTaskStore'
import { toast } from '../../stores/useToastStore'
import type { Category } from '../../types/models'

/**
 * F-1.1 quick add: title + Enter creates a task for today (category Others).
 * Tokens: '#business' category, '~3' estimate, '@tomorrow 2pm' schedules.
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
    const natural = parsed.dateToken ? parseNaturalDate(parsed.dateToken, new Date()) : null
    void addTask(
      {
        title: parsed.title,
        categoryId: category.id,
        estimatePomos: parsed.estimatePomos,
        scheduledTime: natural?.time,
      },
      natural?.date,
    )
    if (natural) toast(`Scheduled for ${formatScheduleLabel(natural)}`)
    else if (parsed.dateToken) toast(`Couldn't read "@${parsed.dateToken}" — added for today`)
    setValue('')
  }

  return (
    <input
      id="quick-add-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && submit()}
      placeholder="+ Add a task — try: Send proposal #business ~2"
      aria-label="Quick add task"
      className="field"
    />
  )
}
