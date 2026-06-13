import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { addCategory, recolorCategory, renameCategory, setCategoryArchived } from '../../db/categoryOps'
import { toast } from '../../stores/useToastStore'

const PALETTE = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#6B7280', '#EF4444', '#EC4899', '#14B8A6', '#0EA5E9']

export function CategoryManager() {
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[5])

  const add = async () => {
    if (!newName.trim()) return
    await addCategory(newName, newColor)
    setNewName('')
    toast('Category added')
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.id} className={`flex items-center gap-2 ${c.archived ? 'opacity-50' : ''}`}>
            <label className="relative h-7 w-7 shrink-0 cursor-pointer rounded-lg" style={{ backgroundColor: c.color }}>
              <input
                type="color"
                value={c.color}
                onChange={(e) => void recolorCategory(c.id, e.target.value)}
                aria-label={`${c.name} color`}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <input
              defaultValue={c.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && void renameCategory(c.id, e.target.value)}
              aria-label={`${c.name} name`}
              className="field flex-1 py-1.5"
            />
            <button
              onClick={() => void setCategoryArchived(c.id, !c.archived)}
              className="btn-soft px-3 py-1.5 text-xs"
              title={c.archived ? 'Restore' : 'Archive (keeps history)'}
            >
              {c.archived ? 'Restore' : 'Archive'}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <div className="flex gap-1">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => setNewColor(color)}
              aria-label={`Pick ${color}`}
              className={`h-6 w-6 rounded-md ${newColor === color ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-gray-900' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder="New category name"
          aria-label="New category name"
          className="field min-w-40 flex-1 py-1.5"
        />
        <button onClick={() => void add()} className="btn-primary">Add</button>
      </div>
    </div>
  )
}
