export const naturalTextExamples = [
  'now',
  'tomorrow at 9:30am',
  'next friday at noon',
  'in 2 hours',
  '3 days ago',
  'a week from tomorrow',
  'last monday at 6pm',
  'day after tomorrow',
  'August 18 at 9am',
  '5 July at midnight',
  '8/4 at 14:30',
  'March 1st 2027',
  '2027-03-01T09:15+11:00',
  '9:45',
] as const

const typingDelay = 45
const erasingDelay = 18
const examplePause = 1_800
const betweenExamplesDelay = 300

/** Animates supported natural-language input examples through an input placeholder. */
export function createNaturalPlaceholder(onChange: (value: string) => void) {
  let exampleIndex = Math.floor(Math.random() * naturalTextExamples.length)
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    onChange('')
  }

  const start = () => {
    stop()
    const example = naturalTextExamples[exampleIndex]!
    let length = 0

    const erase = () => {
      length -= 1
      onChange(example.slice(0, length))
      if (length > 0) {
        timer = setTimeout(erase, erasingDelay)
        return
      }
      exampleIndex = (exampleIndex + 1) % naturalTextExamples.length
      timer = setTimeout(start, betweenExamplesDelay)
    }

    const type = () => {
      length += 1
      onChange(example.slice(0, length))
      timer = setTimeout(
        length < example.length ? type : erase,
        length < example.length ? typingDelay : examplePause,
      )
    }

    type()
  }

  const startNext = () => {
    exampleIndex = (exampleIndex + 1) % naturalTextExamples.length
    start()
  }

  return { start, startNext, stop }
}
