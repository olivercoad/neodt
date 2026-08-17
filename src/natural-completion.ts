export interface NaturalDateCompletion {
  label: string
  insertText: string
}

const vocabulary = [
  'today', 'tomorrow', 'yesterday', 'day after tomorrow', 'day before yesterday',
  'next monday', 'next tuesday', 'next wednesday', 'next thursday', 'next friday', 'next saturday', 'next sunday',
  'last monday', 'last tuesday', 'last wednesday', 'last thursday', 'last friday', 'last saturday', 'last sunday',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'christmas', 'christmas eve', 'xmas', 'new years day', 'new years eve', 'thanksgiving', 'labor day', 'memorial day', 'halloween', 'valentines day', 'independence day',
  'noon', 'midnight', 'in ', 'ago', 'from ', 'plus ',
] as const

/** Builds token and phrase completions for neodt's single-point grammar. */
export function getNaturalDateCompletions(value: string, maximum = 5): NaturalDateCompletion[] {
  if (!value.trim() || maximum < 1) return []
  const normalized = value.toLowerCase()
  const matches = vocabulary
    .filter(candidate => candidate.startsWith(normalized) && candidate !== normalized)
    .map(candidate => ({ label: candidate, insertText: value + candidate.slice(value.length) }))

  return matches.slice(0, maximum)
}
