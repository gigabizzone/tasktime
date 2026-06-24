import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { parseQuickAdd, matchCategory } from '../../lib/quickAdd'
import { parseNaturalDate } from '../../lib/naturalDate'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { todayKey } from '../../lib/dates'
import { toast } from '../../stores/useToastStore'
import type { Category } from '../../types/models'

/**
 * F-1.1 quick add — clicking the tray expands into the full task form so
 * category, estimate, date/time, and notes can all be set before saving,
 * without a second "edit" round-trip. Typing a title + Enter still works as
 * the fast path, and `#category` / `~N` / `@date` tokens are honored when
 * present (the Ctrl/⌘+K command bar remains the one-line power path).
 */
export function QuickAdd({ categories }: { categories: Category[] }) {
  const addTask = useTaskStore((s) => s.addTask)
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const today = todayKey(dayStartHour)
  const titleRef = useRef<HTMLInputElement>(null)

  const othersId = categories.find((c) => c.name === 'Others')?.id ?? categories[0]?.id ?? ''

  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [estimate, setEstimate] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  // Default the category once the list is loaded, and keep the date on today.
  useEffect(() => {
    if (!categoryId && othersId) setCategoryId(othersId)
  }, [othersId, categoryId])
  useEffect(() => {
    if (!expanded) setDate(today)
  }, [today, expanded])

  const clearEntry = () => {
    setTitle('')
    setEstimate('')
    setTime('')
    setNotes('')
  }

  const cancel = () => {
    setExpanded(false)
    clearEntry()
    setCategoryId(othersId)
    setDate(today)
  }

  const submit = () => {
    // Tokens stay supported as a convenience; explicit fields fill the rest.
    const parsed = parseQuickAdd(title)
    const finalTitle = parsed.title || title.trim()
    if (!finalTitle) return

    const category =
      (parsed.categoryToken && matchCategory(parsed.categoryToken, categories)) ||
      categories.find((c) => c.id === categoryId) ||
      categories.find((c) => c.name === 'Others') ||
      categories[0]
    if (!category) return

    const natural = parsed.dateToken ? parseNaturalDate(parsed.dateToken, new Date()) : null
    const targetDate = natural?.date ?? date
    const estimatePomos = parsed.estimatePomos ?? (estimate ? Math.max(1, parseInt(estimate, 10)) : undefined)
    const scheduledTime = natural?.time ?? (time || undefined)

    void addTask(
      { title: finalTitle, categoryId: category.id, estimatePomos, scheduledTime, notes: notes.trim() || undefined },
      targetDate,
    )
    if (targetDate !== today) toast(`Added for ${format(parseISO(targetDate), 'EEE, MMM d')}`)

    // Keep the form open for fast batch entry; retain the chosen date (handy
    // when scheduling several tasks to the same day) but reset the category so
    // each task's category is deliberate.
    clearEntry()
    setCategoryId(othersId)
    titleRef.current?.focus()
  }

  return (
    <div
      className={
        expanded
          ? 'flex flex-col gap-2 rounded-xl border border-blue-300 bg-white p-3 shadow-sm dark:border-blue-700 dark:bg-gray-900'
          : ''
      }
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel()
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault()
          submit()
        }
      }}
    >
      <input
        id="quick-add-input"
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder="+ Add a task…"
        aria-label="Add a task"
        className="field"
      />

      {expanded && (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-0.5 text-xs font-medium text-gray-400">
              Category
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label="Category"
                className="field py-1.5"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-gray-400">
              Estimate
              <input
                type="number"
                min={1}
                max={20}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="🍅"
                aria-label="Estimate in Pomodoros"
                className="field w-20 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-gray-400">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Date"
                className="field py-1.5"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-gray-400">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Scheduled time"
                className="field py-1.5"
              />
            </label>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            aria-label="Notes"
            rows={2}
            className="field"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Enter to add · Esc to close</span>
            <div className="flex gap-2">
              <button onClick={cancel} className="btn-ghost">Cancel</button>
              <button onClick={submit} className="btn-primary">Add task</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
