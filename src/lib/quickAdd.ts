import type { Category } from '../types/models'

export interface QuickAddParse {
  title: string
  /** Raw token after '#', e.g. 'business'. Match against categories with matchCategory. */
  categoryToken?: string
  /** From '~N'. */
  estimatePomos?: number
  /** Raw text after '@' (e.g. 'tomorrow 2pm'). Interpreted in M4; captured now so the grammar is stable. */
  dateToken?: string
}

const ESTIMATE_RE = /(?:^|\s)~(\d{1,2})(?=\s|$)/
const CATEGORY_RE = /(?:^|\s)#(\w+)(?=\s|$)/
// '@tomorrow 2pm' spans words: capture until the next #/~ token or end of input.
const DATE_RE = /(?:^|\s)@(.+?)(?=\s+[#~]\S|$)/

/**
 * Parse a quick-add line like 'Send proposal #business @tomorrow 2pm ~2'.
 * Tokens may appear anywhere; whatever remains is the title.
 */
export function parseQuickAdd(input: string): QuickAddParse {
  let rest = input
  const result: QuickAddParse = { title: '' }

  const estimate = rest.match(ESTIMATE_RE)
  if (estimate) {
    result.estimatePomos = parseInt(estimate[1], 10)
    rest = rest.replace(ESTIMATE_RE, ' ')
  }

  const category = rest.match(CATEGORY_RE)
  if (category) {
    result.categoryToken = category[1]
    rest = rest.replace(CATEGORY_RE, ' ')
  }

  const date = rest.match(DATE_RE)
  if (date) {
    result.dateToken = date[1].trim()
    rest = rest.replace(DATE_RE, ' ')
  }

  result.title = rest.replace(/\s+/g, ' ').trim()
  return result
}

/**
 * Resolve a '#token' against the category list: exact name match first,
 * then prefix match (e.g. 'biz' → 'Business'). Case-insensitive.
 */
export function matchCategory(token: string, categories: Category[]): Category | undefined {
  const t = token.toLowerCase()
  const active = categories.filter((c) => !c.archived)
  return (
    active.find((c) => c.name.toLowerCase() === t) ??
    active.find((c) => c.name.toLowerCase().startsWith(t))
  )
}
