'use client';

import React, { useState, useEffect, useRef } from "react";

// ============================================================================
// Category Configuration
// ============================================================================

const CATEGORIES = [
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'data', label: 'Data', icon: '📊' },
  { id: 'file', label: 'Files', icon: '📁' },
  { id: 'communication', label: 'Chat', icon: '💬' },
  { id: 'automation', label: 'Auto', icon: '⚙️' },
];

type SortOption = 'quality' | 'downloads' | 'name';

// ============================================================================
// TPMJSSearchBar Component
// ============================================================================

interface TPMJSSearchBarProps {
  onSearch: (query: string) => void;
  onCategoryFilter: (category: string | null) => void;
  onSortChange?: (sort: SortOption) => void;
}

export function TPMJSSearchBar({
  onSearch,
  onCategoryFilter,
  onSortChange,
}: TPMJSSearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('quality');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only search if there's a query (at least 2 characters)
    if (value.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        onSearch(value);
      }, 500);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    onCategoryFilter(newCategory);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    onSortChange?.(sort);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search 667+ AI tools..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border-2 border-[var(--empire-gold)]/30 rounded-lg text-white placeholder-gray-500 focus:border-[var(--empire-gold)] focus:outline-none transition-colors"
          style={{ fontFamily: 'Lora, serif' }}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
          🔍
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              selectedCategory === category.id
                ? 'bg-[var(--empire-gold)] text-gray-900 shadow-lg shadow-[var(--empire-gold)]/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
            }`}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            <span className="mr-1">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400" style={{ fontFamily: 'Lora, serif' }}>
          Sort by:
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => handleSortChange('quality')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              sortBy === 'quality'
                ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⭐ Quality
          </button>
          <button
            onClick={() => handleSortChange('downloads')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              sortBy === 'downloads'
                ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⬇ Downloads
          </button>
          <button
            onClick={() => handleSortChange('name')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              sortBy === 'name'
                ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🔤 Name
          </button>
        </div>
      </div>
    </div>
  );
}
