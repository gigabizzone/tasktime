import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { TaskPanel } from './tasks/TaskPanel'
import { useTaskStore } from '../stores/useTaskStore'

/** Standalone Tasks tab on mobile — reorder-only DndContext (long-press to drag). */
export function MobileTaskBoard() {
  const reorderTodo = useTaskStore((s) => s.reorderTodo)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) void reorderTodo(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <TaskPanel />
    </DndContext>
  )
}
