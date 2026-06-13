import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { exportAll, importAll, eraseAll, isBackup } from '../../db/dataTransfer'
import { downloadText } from '../../lib/download'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { toast } from '../../stores/useToastStore'
import { Row } from './controls'

export function DataSection() {
  const hydrate = useSettingsStore((s) => s.hydrate)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState('')

  const onExport = async () => {
    const data = await exportAll()
    downloadText(`focusflow-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, JSON.stringify(data, null, 2), 'application/json')
    toast('Exported all data')
  }

  const onImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      if (!isBackup(parsed)) {
        toast('Not a valid FocusFlow backup')
        return
      }
      await importAll(parsed)
      await hydrate()
      toast('Data imported — reloading…')
      setTimeout(() => window.location.reload(), 600)
    } catch {
      toast('Import failed — file unreadable')
    }
  }

  const onErase = async () => {
    if (confirm !== 'ERASE') return
    await eraseAll()
    toast('All data erased — reloading…')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="flex flex-col gap-4">
      <Row label="Export all data" hint="Download a JSON backup of categories, tasks, sessions, and settings.">
        <button onClick={() => void onExport()} className="btn-soft">Export JSON</button>
      </Row>

      <Row label="Import data" hint="Replaces all current data with a backup file.">
        <button onClick={() => fileRef.current?.click()} className="btn-soft">Choose file…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
      </Row>

      <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <div className="text-sm font-bold text-red-600 dark:text-red-400">Erase all data</div>
        <p className="text-xs text-red-600/80 dark:text-red-400/80">
          Permanently deletes everything. Type <strong>ERASE</strong> to confirm.
        </p>
        <div className="flex gap-2">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="ERASE"
            aria-label="Type ERASE to confirm"
            className="field flex-1 border-red-300 py-1.5 dark:border-red-800"
          />
          <button onClick={() => void onErase()} disabled={confirm !== 'ERASE'} className="btn-danger">
            Erase everything
          </button>
        </div>
      </div>
    </div>
  )
}
