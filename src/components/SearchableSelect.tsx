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
  }

  // Handle option click
  const handleOptionClick = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
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

  // Handle escape key to close dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
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
        aria-invalid={ariaInvalid}
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
        onChange={(e) => onChange(e.target.value)}
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="searchable-select-options-list" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value
                return (
                  <div
                    key={`${opt.value}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleOptionClick(opt.value)}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
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
