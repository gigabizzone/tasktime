import { describe, it, expect } from 'vitest'
import { parseQuickAdd, matchCategory } from './quickAdd'
import type { Category } from '../types/models'

describe('parseQuickAdd', () => {
  it('returns plain text as title', () => {
    expect(parseQuickAdd('Write report')).toEqual({ title: 'Write report' })
  })

  it('parses #category token', () => {
    expect(parseQuickAdd('Write report #business')).toEqual({
      title: 'Write report',
      categoryToken: 'business',
    })
  })

  it('parses ~N estimate', () => {
    expect(parseQuickAdd('Write report ~3')).toEqual({
      title: 'Write report',
      estimatePomos: 3,
    })
  })

  it('parses multi-word @date token', () => {
    expect(parseQuickAdd('Call client @tomorrow 2pm')).toEqual({
      title: 'Call client',
      dateToken: 'tomorrow 2pm',
    })
  })

  it('parses the full PRD example', () => {
    expect(parseQuickAdd('Send proposal #business @tomorrow 2pm ~2')).toEqual({
      title: 'Send proposal',
      categoryToken: 'business',
      dateToken: 'tomorrow 2pm',
      estimatePomos: 2,
    })
  })

  it('handles tokens in any order', () => {
    expect(parseQuickAdd('~1 #learning Read paper @fri')).toEqual({
      title: 'Read paper',
      categoryToken: 'learning',
      dateToken: 'fri',
      estimatePomos: 1,
    })
  })

  it('does not treat mid-word # or ~ as tokens', () => {
    expect(parseQuickAdd('Fix bug#42 in mod~ule')).toEqual({ title: 'Fix bug#42 in mod~ule' })
  })
})

const cats = (names: string[]): Category[] =>
  names.map((name, i) => ({ id: String(i), name, color: '#000', archived: false, isDefault: true }))

describe('matchCategory', () => {
  const categories = cats(['Business', 'Personal', 'Learning', 'Management', 'Others'])

  it('matches exact name case-insensitively', () => {
    expect(matchCategory('business', categories)?.name).toBe('Business')
    expect(matchCategory('LEARNING', categories)?.name).toBe('Learning')
  })

  it('matches by prefix', () => {
    expect(matchCategory('biz', categories)).toBeUndefined() // not a prefix
    expect(matchCategory('bus', categories)?.name).toBe('Business')
    expect(matchCategory('per', categories)?.name).toBe('Personal')
  })

  it('ignores archived categories', () => {
    const archived = cats(['Business']).map((c) => ({ ...c, archived: true }))
    expect(matchCategory('business', archived)).toBeUndefined()
  })

  it('returns undefined for unknown tokens', () => {
    expect(matchCategory('xyz', categories)).toBeUndefined()
  })
})
