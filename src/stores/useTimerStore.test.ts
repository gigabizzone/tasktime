import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../db/db'
import { useTimerStore, LONG_BREAK_MINUTES, remainingMsOf } from './useTimerStore'
import { useSettingsStore } from './useSettingsStore'
import { DEFAULT_SETTINGS, type Task } from '../types/models'

const T0 = new Date('2026-06-12T09:00:00')
const MIN = 60_000
const timer = () => useTimerStore.getState()

const makeTask = (id: string, order: number, estimate?: number): Task => ({
  id,
  title: id,
  categoryId: 'cat1',
  status: 'todo',
  estimatePomos: estimate,
  plannedDate: '2026-06-12',
  order,
  createdAt: T0.toISOString(),
})

async function seedTasks(...tasks: Task[]) {
  await db.tasks.bulkAdd(tasks)
}

describe('useTimerStore', () => {
  beforeEach(async () => {
    // Only fake Date — faking setTimeout would freeze fake-indexeddb's
    // internal scheduling and deadlock every Dexie call.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    await db.tasks.clear()
    await db.sessions.clear()
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: true })
    useTimerStore.setState({
      status: 'idle',
      type: 'focus',
      taskId: null,
      focusMinutes: 25,
      breakMinutes: 5,
      nextBreakIsLong: false,
      startedAt: null,
      sessionStartISO: null,
      elapsedBeforePauseMs: 0,
      completedFocusCount: 0,
      interruptions: [],
      pendingPartial: null,
      focusMode: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start requires an assigned task for focus sessions', () => {
    timer().start()
    expect(timer().status).toBe('idle')
  })

  it('start runs and marks the task in_progress', async () => {
    await seedTasks(makeTask('t1', 0))
    timer().assignTask('t1')
    timer().start()
    expect(timer().status).toBe('running')
    expect(timer().sessionStartISO).toBe(T0.toISOString())
    await vi.waitFor(async () => {
      expect((await db.tasks.get('t1'))?.status).toBe('in_progress')
    })
  })

  it('pause freezes elapsed time; resume continues from it', () => {
    useTimerStore.setState({ taskId: 't1' })
    timer().start()
    vi.setSystemTime(T0.getTime() + 5 * MIN)
    timer().pause()
    expect(timer().elapsedBeforePauseMs).toBe(5 * MIN)
    vi.setSystemTime(T0.getTime() + 12 * MIN) // 7 paused minutes don't count
    timer().resume()
    vi.setSystemTime(T0.getTime() + 14 * MIN)
    expect(remainingMsOf(timer())).toBe((25 - 7) * MIN)
  })

  it('completing a focus session records it and auto-starts the break', async () => {
    await seedTasks(makeTask('t1', 0, 2))
    timer().assignTask('t1')
    timer().setFocusMinutes(20)
    timer().start()
    const end = T0.getTime() + 20 * MIN
    vi.setSystemTime(end)
    await timer().checkCompletion(end)

    const sessions = await db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      taskId: 't1',
      categoryId: 'cat1',
      type: 'focus',
      plannedMinutes: 20,
      actualMinutes: 20,
      completed: true,
      counted: true,
    })
    expect(timer().completedFocusCount).toBe(1)
    expect(timer().type).toBe('break')
    expect(timer().status).toBe('running') // autoStartBreak default ON
  })

  it('offers the break without starting when autoStartBreak is off', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, autoStartBreak: false },
      hydrated: true,
    })
    await seedTasks(makeTask('t1', 0))
    timer().assignTask('t1')
    timer().start()
    const end = T0.getTime() + 25 * MIN
    await timer().checkCompletion(end)
    expect(timer().type).toBe('break')
    expect(timer().status).toBe('idle')
  })

  it('suggests a long break after every 4th completed focus session', async () => {
    await seedTasks(makeTask('t1', 0))
    useTimerStore.setState({ taskId: 't1', completedFocusCount: 3 })
    timer().start()
    const end = T0.getTime() + 25 * MIN
    await timer().checkCompletion(end)
    expect(timer().nextBreakIsLong).toBe(true)
    expect(remainingMsOf(timer(), end)).toBe(LONG_BREAK_MINUTES * MIN)
  })

  it('skip after ≥1 min asks to count; counting records a partial session', async () => {
    await seedTasks(makeTask('t1', 0))
    timer().assignTask('t1')
    timer().start()
    vi.setSystemTime(T0.getTime() + 17 * MIN)
    await timer().skip()
    expect(timer().status).toBe('idle')
    expect(timer().pendingPartial).toMatchObject({ taskId: 't1', actualMinutes: 17 })

    await timer().resolvePartial(true)
    const sessions = await db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ completed: false, counted: true, actualMinutes: 17 })
  })

  it('discarded partials are still recorded for completion-rate stats', async () => {
    await seedTasks(makeTask('t1', 0))
    timer().assignTask('t1')
    timer().start()
    vi.setSystemTime(T0.getTime() + 10 * MIN)
    await timer().skip()
    await timer().resolvePartial(false)
    const sessions = await db.sessions.toArray()
    expect(sessions[0]).toMatchObject({ completed: false, counted: false })
  })

  it('skip under 1 minute discards silently', async () => {
    timer().assignTask('t1')
    timer().start()
    vi.setSystemTime(T0.getTime() + 20_000)
    await timer().skip()
    expect(timer().pendingPartial).toBeNull()
    expect(await db.sessions.count()).toBe(0)
  })

  it('cancel discards without recording', async () => {
    timer().assignTask('t1')
    timer().start()
    vi.setSystemTime(T0.getTime() + 10 * MIN)
    timer().cancel()
    expect(timer().status).toBe('idle')
    expect(await db.sessions.count()).toBe(0)
  })

  it('interruptions are logged into the recorded session', async () => {
    await seedTasks(makeTask('t1', 0))
    timer().assignTask('t1')
    timer().start()
    timer().addInterruption('phone call')
    timer().addInterruption()
    const end = T0.getTime() + 25 * MIN
    await timer().checkCompletion(end)
    const [session] = await db.sessions.toArray()
    expect(session.interruptions).toHaveLength(2)
    expect(session.interruptions[0].note).toBe('phone call')
  })

  it('finishing a break advances the queue to the next task with remaining estimate', async () => {
    await seedTasks(makeTask('t1', 0, 1), makeTask('t2', 1, 2))
    // t1 already did its one estimated session
    await db.sessions.add({
      id: 's1',
      taskId: 't1',
      categoryId: 'cat1',
      type: 'focus',
      plannedMinutes: 25,
      actualMinutes: 25,
      startedAt: T0.toISOString(),
      endedAt: T0.toISOString(),
      completed: true,
      counted: true,
      interruptions: [],
    })
    useTimerStore.setState({
      status: 'running',
      type: 'break',
      taskId: 't1',
      startedAt: T0.getTime(),
      sessionStartISO: T0.toISOString(),
    })
    const end = T0.getTime() + 5 * MIN
    vi.setSystemTime(end)
    await timer().checkCompletion(end)
    expect(timer().type).toBe('focus')
    expect(timer().status).toBe('idle')
    expect(timer().taskId).toBe('t2')
  })

  it('recover finalizes a focus session that completed while the app was closed', async () => {
    await seedTasks(makeTask('t1', 0))
    useTimerStore.setState({
      status: 'running',
      type: 'focus',
      taskId: 't1',
      focusMinutes: 25,
      startedAt: T0.getTime() - 40 * MIN, // started 40 min ago, planned 25
      sessionStartISO: new Date(T0.getTime() - 40 * MIN).toISOString(),
    })
    await timer().recover()
    const [session] = await db.sessions.toArray()
    expect(session).toMatchObject({ type: 'focus', completed: true, actualMinutes: 25 })
    // ended exactly at start + planned, not "now"
    expect(session.endedAt).toBe(new Date(T0.getTime() - 15 * MIN).toISOString())
    expect(timer().status).toBe('idle')
    expect(timer().type).toBe('break') // break offered, not auto-started
  })

  it('recover leaves a still-running session alone', async () => {
    useTimerStore.setState({
      status: 'running',
      type: 'focus',
      taskId: 't1',
      focusMinutes: 25,
      startedAt: T0.getTime() - 10 * MIN,
      sessionStartISO: new Date(T0.getTime() - 10 * MIN).toISOString(),
    })
    await timer().recover()
    expect(timer().status).toBe('running')
    expect(await db.sessions.count()).toBe(0)
  })
})
