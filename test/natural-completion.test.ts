import { describe, expect, it } from 'vitest'
import { getNaturalDateCompletions } from '../src/natural-completion'

describe('getNaturalDateCompletions', () => {
  it('returns ordered case-preserving completions for a partial phrase', () => {
    expect(getNaturalDateCompletions('tom')).toEqual([{ label: 'tomorrow', insertText: 'tomorrow' }])
    expect(getNaturalDateCompletions('NEXT F')).toEqual([{ label: 'next friday', insertText: 'NEXT Friday' }])
  })

  it('completes supported holidays and does not offer range grammar', () => {
    expect(getNaturalDateCompletions('christmas e')).toEqual([{ label: 'christmas eve', insertText: 'christmas eve' }])
    expect(getNaturalDateCompletions('march 14 to ')).toEqual([])
  })

  it('does not complete empty or already complete text', () => {
    expect(getNaturalDateCompletions('')).toEqual([])
    expect(getNaturalDateCompletions('tomorrow')).toEqual([])
  })
})
