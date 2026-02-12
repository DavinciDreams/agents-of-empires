'use client';

import { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

export interface DropdownButtonProps {
  label: string;
  icon?: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
}

/**
 * Reusable dropdown button component
 * Styled to match the game's RTS theme
 */
export function DropdownButton({
  label,
  icon,
  options,
  onSelect,
  className = '',
  dropdownClassName = '',
  disabled = false,
}: DropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-2 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1 ${
          disabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        } ${className}`}
        title={label}
      >
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1 right-0 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[120px] ${dropdownClassName}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-xs font-mono text-left text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 first:rounded-t last:rounded-b"
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
