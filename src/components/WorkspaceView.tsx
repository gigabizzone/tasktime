import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { TaskPanel } from './tasks/TaskPanel'
import { TimerPanel, TIMER_DROP_ID } from './timer/TimerPanel'
import { useTaskStore } from '../stores/useTaskStore'
import { useTimerStore } from '../stores/useTimerStore'

// Prefer whatever the pointer is actually over (so the timer dropzone wins
// when hovered), falling back to list-sorting collisions.
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length > 0 ? within : closestCenter(args)
}

/** Two-panel desktop workspace; one DndContext spans both so tasks can be
 *  reordered in the list or dropped onto the timer (F-2.3). */
export function WorkspaceView() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const reorderTodo = useTaskStore((s) => s.reorderTodo)
  const assignTask = useTimerStore((s) => s.assignTask)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    if (over.id === TIMER_DROP_ID) assignTask(String(active.id))
    else if (active.id !== over.id) void reorderTodo(String(active.id), String(over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
      <TaskPanel />
      <TimerPanel />
    </DndContext>
  )
}
