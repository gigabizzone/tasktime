import { useTaskStore } from '../../stores/useTaskStore'

/** F-1.8: 5-second undo toast after delete — no confirmation dialogs. */
export function UndoToast() {
  const pendingDelete = useTaskStore((s) => s.pendingDelete)
  const undoDelete = useTaskStore((s) => s.undoDelete)

  if (!pendingDelete) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-xl dark:bg-gray-100 dark:text-gray-900"
    >
      <span className="max-w-60 truncate">Deleted "{pendingDelete.title}"</span>
      <button
        onClick={() => void undoDelete()}
        className="font-semibold text-blue-400 hover:underline dark:text-blue-600"
      >
        Undo
      </button>
    </div>
  )
}
