import { db, SETTINGS_KEY } from './db'
import { DEFAULT_SETTINGS, type Category, type Session, type Settings, type Task } from '../types/models'

export interface BackupV1 {
  app: 'focusflow'
  version: 1
  exportedAt: string
  categories: Category[]
  tasks: Task[]
  sessions: Session[]
  settings: Settings
}

/** F-5 Data: export everything as one JSON blob. */
export async function exportAll(): Promise<BackupV1> {
  const [categories, tasks, sessions, settingsRow] = await Promise.all([
    db.categories.toArray(),
    db.tasks.toArray(),
    db.sessions.toArray(),
    db.settings.get(SETTINGS_KEY),
  ])
  return {
    app: 'focusflow',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    tasks,
    sessions,
    settings: settingsRow?.value ?? DEFAULT_SETTINGS,
  }
}

export function isBackup(data: unknown): data is BackupV1 {
  const d = data as Partial<BackupV1>
  return !!d && d.app === 'focusflow' && Array.isArray(d.categories) && Array.isArray(d.tasks) && Array.isArray(d.sessions)
}

/** Replace all data with the backup's contents (atomic). */
export async function importAll(backup: BackupV1): Promise<void> {
  await db.transaction('rw', db.categories, db.tasks, db.sessions, db.settings, async () => {
    await Promise.all([db.categories.clear(), db.tasks.clear(), db.sessions.clear(), db.settings.clear()])
    await db.categories.bulkAdd(backup.categories)
    await db.tasks.bulkAdd(backup.tasks)
    await db.sessions.bulkAdd(backup.sessions)
    await db.settings.put({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS, ...backup.settings } })
  })
}

/** Erase all data (typed confirmation enforced by the UI). */
export async function eraseAll(): Promise<void> {
  await db.transaction('rw', db.categories, db.tasks, db.sessions, db.settings, async () => {
    await Promise.all([db.categories.clear(), db.tasks.clear(), db.sessions.clear(), db.settings.clear()])
  })
}
