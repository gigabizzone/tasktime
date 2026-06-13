import { describe, it, expect } from 'vitest'
import { calcStreak, calcStreakWithFreezes, freezesAvailableThisWeek } from './stats'
import { formatClock, formatMinutes } from './format'

describe('calcStreak', () => {
  it('counts consecutive days ending today', () => {
    const days = new Set(['2026-06-10', '2026-06-11', '2026-06-12'])
    expect(calcStreak(days, '2026-06-12')).toBe(3)
  })

  it('does not break the streak when today is not yet active', () => {
    const days = new Set(['2026-06-10', '2026-06-11'])
    expect(calcStreak(days, '2026-06-12')).toBe(2)
  })

  it('stops at gaps', () => {
    const days = new Set(['2026-06-08', '2026-06-11', '2026-06-12'])
    expect(calcStreak(days, '2026-06-12')).toBe(2)
  })

  it('is 0 with no recent activity', () => {
    expect(calcStreak(new Set(['2026-06-01']), '2026-06-12')).toBe(0)
    expect(calcStreak(new Set(), '2026-06-12')).toBe(0)
  })

  it('crosses month boundaries', () => {
    const days = new Set(['2026-05-31', '2026-06-01'])
    expect(calcStreak(days, '2026-06-01')).toBe(2)
  })
})

describe('calcStreakWithFreezes', () => {
  it('matches the plain streak when there are no gaps', () => {
    const days = new Set(['2026-06-10', '2026-06-11', '2026-06-12'])
    expect(calcStreakWithFreezes(days, '2026-06-12')).toEqual({ streak: 3, frozenDays: [] })
  })

  it('bridges a single missed day with a freeze token', () => {
    // missed Jun 11; active Jun 9, 10, 12
    const days = new Set(['2026-06-09', '2026-06-10', '2026-06-12'])
    const r = calcStreakWithFreezes(days, '2026-06-12')
    expect(r.streak).toBe(3) // three active days, bridged across the gap
    expect(r.frozenDays).toEqual(['2026-06-11'])
  })

  it('only allows one freeze per ISO week', () => {
    // Mon-Sun 2026-06-08..14: active Mon, Wed, Fri (two gaps in one week)
    const days = new Set(['2026-06-08', '2026-06-10', '2026-06-12'])
    const r = calcStreakWithFreezes(days, '2026-06-12')
    // from Fri back: freeze Thu (Jun 11), reach Wed; gap Tue needs a 2nd freeze
    // in the same ISO week → blocked.
    expect(r.streak).toBe(2)
    expect(r.frozenDays).toEqual(['2026-06-11'])
  })

  it('does not bridge two consecutive missed days', () => {
    const days = new Set(['2026-06-09', '2026-06-12'])
    expect(calcStreakWithFreezes(days, '2026-06-12').streak).toBe(1)
  })

  it('reports freezes available in the current week', () => {
    expect(freezesAvailableThisWeek([], '2026-06-12')).toBe(1)
    expect(freezesAvailableThisWeek(['2026-06-11'], '2026-06-12')).toBe(0)
    // a freeze used in a different week doesn't reduce this week's allowance
    expect(freezesAvailableThisWeek(['2026-06-01'], '2026-06-12')).toBe(1)
  })
})

describe('format helpers', () => {
  it('formatClock renders M:SS and rounds up', () => {
    expect(formatClock(1062000)).toBe('17:42')
    expect(formatClock(59_400)).toBe('1:00')
    expect(formatClock(0)).toBe('0:00')
  })

  it('formatMinutes renders h/m', () => {
    expect(formatMinutes(225)).toBe('3h 45m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(0)).toBe('0m')
  })
})
