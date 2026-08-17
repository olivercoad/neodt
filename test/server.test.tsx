import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { isServer, renderToString } from 'solid-js/web'
import { DateTimeLocal } from '../src'

describe('environment', () => {
  it('runs on server', () => {
    expect(typeof window).toBe('undefined')
    expect(isServer).toBe(true)
  })
})

describe('DateTimeLocal', () => {
  it('renders a segmented editor on the server', () => {
    const html = renderToString(() => <DateTimeLocal referenceTime={DateTime.fromISO('2026-08-17T15:30:00Z')} locale="en-GB" value="2026-08-17T15:30" />)
    expect(html).toContain('datetime-neo__segment')
    expect(html).not.toContain('datetime-local')
  })
})
