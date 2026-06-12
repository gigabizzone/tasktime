import Dexie, { type EntityTable } from 'dexie'
import type { Category, Task, Session, Settings } from '../types/models'

export interface SettingsRow {
  key: string
  value: Settings
}

export class FocusFlowDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  tasks!: EntityTable<Task, 'id'>
  sessions!: EntityTable<Session, 'id'>
  settings!: EntityTable<SettingsRow, 'key'>

  constructor() {
    super('focusflow')
    this.version(1).stores({
      categories: 'id',
      tasks: 'id, plannedDate, [plannedDate+order], categoryId, status',
      sessions: 'id, taskId, categoryId, startedAt, [type+startedAt]',
      settings: 'key',
    })
  }
}

export const db = new FocusFlowDB()

export const SETTINGS_KEY = 'app'
