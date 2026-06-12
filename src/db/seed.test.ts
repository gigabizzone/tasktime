import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FocusFlowDB, SETTINGS_KEY } from './db'
import { seed } from './seed'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../types/models'

describe('seed', () => {
  let db: FocusFlowDB

  beforeEach(async () => {
    await new FocusFlowDB().delete()
    db = new FocusFlowDB()
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates the 5 default categories with PRD colors', async () => {
    await seed(db)
    const categories = await db.categories.toArray()
    expect(categories).toHaveLength(5)
    for (const expected of DEFAULT_CATEGORIES) {
      const cat = categories.find((c) => c.name === expected.name)
      expect(cat).toBeDefined()
      expect(cat!.color).toBe(expected.color)
      expect(cat!.isDefault).toBe(true)
      expect(cat!.archived).toBe(false)
    }
  })

  it('creates default settings', async () => {
    await seed(db)
    const row = await db.settings.get(SETTINGS_KEY)
    expect(row?.value).toEqual(DEFAULT_SETTINGS)
  })

  it('is idempotent — seeding twice does not duplicate or overwrite', async () => {
    await seed(db)
    await db.settings.put({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS, defaultFocusMinutes: 50 } })
    await seed(db)
    expect(await db.categories.count()).toBe(5)
    const row = await db.settings.get(SETTINGS_KEY)
    expect(row?.value.defaultFocusMinutes).toBe(50)
  })
})
