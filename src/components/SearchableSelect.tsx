'use client'

import React, { useState, useRef, useEffect } from 'react'

interface OptionObject {
  label: string;
  value?: string;
}
export type SelectOption = string | OptionObject;

interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  ariaInvalid?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  ariaDescribedby?: string;
}

export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Pilih salah satu',
  required = false,
  className = '',
  ariaInvalid = 'false',
  ariaDescribedby,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Normalize options to { label, value } array
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt }
    }
    return { label: opt.label, value: opt.value ?? opt.label }
  })

  // Find selected option label
  const selectedOption = normalizedOptions.find((opt) => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev)
    setSearch('')
    setHighlightedIndex(-1)
  }

  // Handle option click
  const handleOptionClick = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
    setHighlightedIndex(-1)
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
      setHighlightedIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex].value)
        }
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${isOpen ? 'open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={ariaDescribedby}
        onClick={toggleDropdown}
        className={`${className} searchable-select-trigger`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <span style={{ flexGrow: 1, paddingRight: '8px' }}>
          {displayLabel}
        </span>
      </button>

      {/* Hidden native select to ensure native HTML5 validation and autofill works */}
      <select
        name={name}
        value={value}
        required={required}
        aria-invalid={ariaInvalid}
        onChange={(e) => {
          onChange(e.target.value)
          setHighlightedIndex(-1)
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <option value=""></option>
        {normalizedOptions.map((opt, index) => (
          <option key={`${opt.value}-${index}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="searchable-select-search-input"
              placeholder="Cari..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setHighlightedIndex(-1)
              }}
            />
          </div>
          <div className="searchable-select-options-list" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value
                const isHighlighted = index === highlightedIndex
                return (
                  <div
                    key={`${opt.value}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleOptionClick(opt.value)}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  >
                    {opt.label}
                  </div>
                )
              })
            ) : (
              <div className="searchable-select-no-results">Tidak ada opsi ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
