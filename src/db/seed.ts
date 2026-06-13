import { nanoid } from 'nanoid'
import type { FocusFlowDB } from './db'
import { SETTINGS_KEY } from './db'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, type Task } from '../types/models'
import { todayKey } from '../lib/dates'

/**
 * Idempotent: seeds default categories and settings only when absent, and on
 * the very first run also creates 3 sample tasks to teach the basics.
 * Safe to run on every boot.
 */
export async function seed(db: FocusFlowDB): Promise<void> {
  await db.transaction('rw', db.categories, db.tasks, db.settings, async () => {
    const firstRun = (await db.categories.count()) === 0

    if (firstRun) {
      const ids = DEFAULT_CATEGORIES.map((c) => ({
        id: nanoid(),
        name: c.name,
        color: c.color,
        archived: false,
        isDefault: true,
      }))
      await db.categories.bulkAdd(ids)

      const byName = (name: string) => ids.find((c) => c.name === name)!.id
      const today = todayKey(0)
      const now = new Date().toISOString()
      const samples: Array<Pick<Task, 'title' | 'categoryId' | 'estimatePomos'>> = [
        { title: 'Plan today’s top 3 priorities', categoryId: byName('Management'), estimatePomos: 1 },
        { title: 'Deep work block — your biggest task', categoryId: byName('Business'), estimatePomos: 2 },
        { title: 'Read for 25 minutes', categoryId: byName('Learning'), estimatePomos: 1 },
      ]
      await db.tasks.bulkAdd(
        samples.map((t, i) => ({
          id: nanoid(),
          title: t.title,
          categoryId: t.categoryId,
          status: 'todo' as const,
          estimatePomos: t.estimatePomos,
          plannedDate: today,
          order: i,
          createdAt: now,
        })),
      )
    }

    if ((await db.settings.get(SETTINGS_KEY)) === undefined) {
      await db.settings.add({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS } })
    }
  })
}
