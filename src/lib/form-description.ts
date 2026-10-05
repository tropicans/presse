export type DescriptionBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: { number: string; text: string }[] }

export function parseDescriptionBlocks(raw: string | null | undefined): DescriptionBlock[] {
  if (!raw || typeof raw !== 'string') {
    return []
  }

  const lines = raw.split(/\r?\n/)
  const blocks: DescriptionBlock[] = []

  let currentParagraphLines: string[] = []
  let currentUnorderedItems: string[] = []
  let currentOrderedItems: { number: string; text: string }[] = []

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join('\n').trim()
      if (text) {
        blocks.push({ type: 'paragraph', text })
      }
      currentParagraphLines = []
    }
  }

  const flushUnordered = () => {
    if (currentUnorderedItems.length > 0) {
      blocks.push({ type: 'unordered-list', items: [...currentUnorderedItems] })
      currentUnorderedItems = []
    }
  }

  const flushOrdered = () => {
    if (currentOrderedItems.length > 0) {
      blocks.push({ type: 'ordered-list', items: [...currentOrderedItems] })
      currentOrderedItems = []
    }
  }

  const flushAll = () => {
    flushParagraph()
    flushUnordered()
    flushOrdered()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushAll()
      continue
    }

    // Check for unordered list (- or * or • or +)
    const unorderedMatch = trimmed.match(/^([-*•+])\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      flushOrdered()
      currentUnorderedItems.push(unorderedMatch[2].trim())
      continue
    }

    // Check for ordered list (1. or 1) )
    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      flushUnordered()
      currentOrderedItems.push({
        number: orderedMatch[1],
        text: orderedMatch[2].trim(),
      })
      continue
    }

    // Plain text line
    flushUnordered()
    flushOrdered()
    currentParagraphLines.push(trimmed)
  }

  flushAll()

  return blocks
}
