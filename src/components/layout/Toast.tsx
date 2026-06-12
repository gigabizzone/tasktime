import { useToastStore } from '../../stores/useToastStore'

export function Toast() {
  const { message, action, clear } = useToastStore()
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-xl dark:bg-gray-100 dark:text-gray-900"
    >
      <span className="max-w-80 truncate">{message}</span>
      {action && (
        <button
          onClick={() => {
            action.run()
            clear()
          }}
          className="font-semibold text-blue-400 hover:underline dark:text-blue-600"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
