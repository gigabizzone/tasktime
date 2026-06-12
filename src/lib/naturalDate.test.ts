import { describe, it, expect } from 'vitest'
import { parseNaturalDate, parseTimeToken } from './naturalDate'

// Friday, June 12, 2026
const NOW = new Date(2026, 5, 12, 10, 0)

describe('parseTimeToken', () => {
  it('parses 12-hour and 24-hour forms', () => {
    expect(parseTimeToken('2pm')).toBe('14:00')
    expect(parseTimeToken('2:30pm')).toBe('14:30')
    expect(parseTimeToken('9am')).toBe('09:00')
    expect(parseTimeToken('12am')).toBe('00:00')
    expect(parseTimeToken('12pm')).toBe('12:00')
    expect(parseTimeToken('14:30')).toBe('14:30')
  })

  it('rejects bare numbers and nonsense', () => {
    expect(parseTimeToken('15')).toBeNull()
    expect(parseTimeToken('25:00')).toBeNull()
    expect(parseTimeToken('abc')).toBeNull()
  })
})

describe('parseNaturalDate', () => {
  it('parses today and tomorrow', () => {
    expect(parseNaturalDate('today', NOW)).toEqual({ date: '2026-06-12' })
    expect(parseNaturalDate('tomorrow', NOW)).toEqual({ date: '2026-06-13' })
  })

  it('parses tomorrow 2pm (the PRD flow-B example)', () => {
    expect(parseNaturalDate('tomorrow 2pm', NOW)).toEqual({ date: '2026-06-13', time: '14:00' })
  })

  it('parses weekday names as the next occurrence, never today', () => {
    expect(parseNaturalDate('mon', NOW)).toEqual({ date: '2026-06-15' })
    expect(parseNaturalDate('next mon', NOW)).toEqual({ date: '2026-06-15' })
    // NOW is a Friday → 'fri' is next Friday, not today
    expect(parseNaturalDate('fri', NOW)).toEqual({ date: '2026-06-19' })
  })

  it('parses weekday with time', () => {
    expect(parseNaturalDate('mon 9am', NOW)).toEqual({ date: '2026-06-15', time: '09:00' })
  })

  it('parses month-day forms, rolling past dates to next year', () => {
    expect(parseNaturalDate('jun 15', NOW)).toEqual({ date: '2026-06-15' })
    expect(parseNaturalDate('15 jun', NOW)).toEqual({ date: '2026-06-15' })
    expect(parseNaturalDate('jan 5', NOW)).toEqual({ date: '2027-01-05' })
  })

  it('parses ISO dates with optional time', () => {
    expect(parseNaturalDate('2026-07-01', NOW)).toEqual({ date: '2026-07-01' })
    expect(parseNaturalDate('2026-07-01 14:30', NOW)).toEqual({ date: '2026-07-01', time: '14:30' })
  })

  it('treats a bare time as today', () => {
    expect(parseNaturalDate('2pm', NOW)).toEqual({ date: '2026-06-12', time: '14:00' })
  })

  it('returns null for unrecognized input', () => {
    expect(parseNaturalDate('someday', NOW)).toBeNull()
    expect(parseNaturalDate('', NOW)).toBeNull()
    expect(parseNaturalDate('tomorrow xyz', NOW)).toBeNull()
  })
})
