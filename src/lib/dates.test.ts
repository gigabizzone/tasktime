import { describe, it, expect } from 'vitest'
import { toDayKey } from './dates'

describe('toDayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDayKey(new Date(2026, 5, 12, 14, 30))).toBe('2026-06-12')
  })

  it('buckets early-morning work to the previous day when dayStartHour is set', () => {
    // 2 AM with day starting at 4 AM → still "yesterday"
    expect(toDayKey(new Date(2026, 5, 12, 2, 0), 4)).toBe('2026-06-11')
  })

  it('buckets work at/after dayStartHour to the current day', () => {
    expect(toDayKey(new Date(2026, 5, 12, 4, 0), 4)).toBe('2026-06-12')
    expect(toDayKey(new Date(2026, 5, 12, 23, 59), 4)).toBe('2026-06-12')
  })

  it('crosses month boundaries correctly', () => {
    expect(toDayKey(new Date(2026, 6, 1, 1, 0), 4)).toBe('2026-06-30')
  })
})
