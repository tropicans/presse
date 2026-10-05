'use client'

import React from 'react'
import { parseDescriptionBlocks, type DescriptionBlock } from '@/lib/form-description'

interface FormDescriptionProps {
  description: string | null | undefined
  fallback?: string
  className?: string
  variant?: 'public' | 'preview' | 'admin'
}

function parseInline(text: string): React.ReactNode[] {
  // 1. Split on **bold**
  const boldParts = text.split(/\*\*([^*]+)\*\*/g)
  return boldParts.flatMap((bPart, bIdx) => {
    if (bIdx % 2 === 1) {
      return [
        <strong key={`b-${bIdx}`} className="form-description-bold">
          {bPart}
        </strong>,
      ]
    }

    // 2. Split on *italic*
    const italicParts = bPart.split(/\*([^*]+)\*/g)
    return italicParts.flatMap((iPart, iIdx) => {
      if (iIdx % 2 === 1) {
        return [
          <em key={`i-${bIdx}-${iIdx}`} className="form-description-italic">
            {iPart}
          </em>,
        ]
      }

      // 3. Split on `code`
      const codeParts = iPart.split(/`([^`]+)`/g)
      return codeParts.map((cPart, cIdx) => {
        if (cIdx % 2 === 1) {
          return (
            <code key={`c-${bIdx}-${iIdx}-${cIdx}`} className="form-description-code">
              {cPart}
            </code>
          )
        }
        return cPart
      })
    })
  })
}

function renderBlock(block: DescriptionBlock, index: number) {
  switch (block.type) {
    case 'paragraph': {
      const lines = block.text.split('\n')
      return (
        <p key={index} className="form-description-paragraph">
          {lines.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {parseInline(line)}
            </React.Fragment>
          ))}
        </p>
      )
    }

    case 'unordered-list': {
      return (
        <ul key={index} className="form-description-list form-description-unordered">
          {block.items.map((item, itemIdx) => (
            <li key={itemIdx} className="form-description-item">
              <span className="form-description-bullet" aria-hidden="true" />
              <span className="form-description-item-text">{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      )
    }

    case 'ordered-list': {
      return (
        <ol key={index} className="form-description-list form-description-ordered">
          {block.items.map((item, itemIdx) => (
            <li key={itemIdx} className="form-description-item">
              <span className="form-description-number" aria-hidden="true">
                {`${item.number}.`}
              </span>
              <span className="form-description-item-text">{parseInline(item.text)}</span>
            </li>
          ))}
        </ol>
      )
    }

    default:
      return null
  }
}

export default function FormDescription({
  description,
  fallback,
  className = '',
  variant = 'public',
}: FormDescriptionProps) {
  const blocks = parseDescriptionBlocks(description)

  if (blocks.length === 0) {
    if (!fallback) return null
    return (
      <div className={`form-description form-description-${variant} ${className}`.trim()}>
        <p className="form-description-paragraph form-description-fallback">{fallback}</p>
      </div>
    )
  }

  return (
    <div className={`form-description form-description-${variant} ${className}`.trim()}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  )
}
