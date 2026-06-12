export type ID = string // nanoid

export interface Category {
  id: ID
  name: string // "Business"
  color: string // hex
  archived: boolean
  isDefault: boolean
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: ID
  title: string
  notes?: string
  categoryId: ID
  status: TaskStatus
  estimatePomos?: number // planned sessions
  plannedDate: string // 'YYYY-MM-DD' — which day plan it belongs to
  scheduledTime?: string // 'HH:mm' optional reminder time
  order: number // position within the day plan
  createdAt: string // ISO
  completedAt?: string // ISO
}

export type SessionType = 'focus' | 'break'

export interface Interruption {
  at: string // ISO
  note?: string
}

export interface Session {
  id: ID
  taskId: ID
  categoryId: ID // denormalized for fast reporting
  type: SessionType
  plannedMinutes: number // 20–60 focus / 5–20 break
  actualMinutes: number // elapsed when ended
  startedAt: string // ISO
  endedAt: string // ISO
  completed: boolean // ran full duration
  counted: boolean // user chose to count a partial session
  interruptions: Interruption[]
}

export type Theme = 'light' | 'dark' | 'system'
export type WeekStart = 0 | 1 | 6 // Sunday | Monday | Saturday

export interface Settings {
  defaultFocusMinutes: number // one of 20..60 step 5
  defaultBreakMinutes: number // 5 | 10 | 15 | 20
  longBreakEvery: number // default 4
  autoStartBreak: boolean
  autoAdvanceQueue: boolean
  soundEnabled: boolean
  soundVolume: number // 0..1
  notificationsEnabled: boolean
  theme: Theme
  weekStartsOn: WeekStart
  dayStartHour: number // default 0
}

export const FOCUS_MINUTES = [20, 25, 30, 35, 40, 45, 50, 55, 60] as const
export const BREAK_MINUTES = [5, 10, 15, 20] as const

export const DEFAULT_SETTINGS: Settings = {
  defaultFocusMinutes: 25,
  defaultBreakMinutes: 5,
  longBreakEvery: 4,
  autoStartBreak: true,
  autoAdvanceQueue: true,
  soundEnabled: true,
  soundVolume: 0.7,
  notificationsEnabled: true,
  theme: 'system',
  weekStartsOn: 1,
  dayStartHour: 0,
}

export const DEFAULT_CATEGORIES: Array<Pick<Category, 'name' | 'color'>> = [
  { name: 'Business', color: '#3B82F6' },
  { name: 'Personal', color: '#22C55E' },
  { name: 'Learning', color: '#8B5CF6' },
  { name: 'Management', color: '#F59E0B' },
  { name: 'Others', color: '#6B7280' },
]
