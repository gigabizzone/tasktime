import { nanoid } from 'nanoid'
import type { FocusFlowDB } from './db'
import { SETTINGS_KEY } from './db'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../types/models'

/**
 * Idempotent: seeds default categories and settings only when absent.
 * Safe to run on every boot.
 */
export async function seed(db: FocusFlowDB): Promise<void> {
  await db.transaction('rw', db.categories, db.settings, async () => {
    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(
        DEFAULT_CATEGORIES.map((c) => ({
          id: nanoid(),
          name: c.name,
          color: c.color,
          archived: false,
          isDefault: true,
        })),
      )
    }
    if ((await db.settings.get(SETTINGS_KEY)) === undefined) {
      await db.settings.add({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS } })
    }
  })
}
