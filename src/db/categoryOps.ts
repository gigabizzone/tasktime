import { nanoid } from 'nanoid'
import { db } from './db'
import type { ID } from '../types/models'

export async function addCategory(name: string, color: string): Promise<void> {
  await db.categories.add({ id: nanoid(), name: name.trim(), color, archived: false, isDefault: false })
}

export async function renameCategory(id: ID, name: string): Promise<void> {
  await db.categories.update(id, { name: name.trim() })
}

export async function recolorCategory(id: ID, color: string): Promise<void> {
  await db.categories.update(id, { color })
}

/** Never hard-delete a category with history — archive instead (PRD §5.5). */
export async function setCategoryArchived(id: ID, archived: boolean): Promise<void> {
  await db.categories.update(id, { archived })
}
