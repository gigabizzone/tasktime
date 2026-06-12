import { describe, it, expect } from 'vitest'
import { calcStreak } from './stats'
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
