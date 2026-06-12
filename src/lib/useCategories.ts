import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category } from '../types/models'

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.filter((c) => !c.archived).toArray(), []) ?? []
}
