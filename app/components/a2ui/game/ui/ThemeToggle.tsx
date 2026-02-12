'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Theme Types
// ============================================================================

export type Theme = 'dark' | 'light';

interface ThemeColors {
  // Background
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // UI Elements
  border: string;
  borderHover: string;
  accent: string;
  accentHover: string;

  // Game-specific
  minimap: string;
  fog: string;
  terrainAmbient: number;
}

// ============================================================================
// Theme Definitions
// ============================================================================

export const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bgPrimary: '#1a1a2e',
    bgSecondary: '#16213e',
    bgTertiary: '#0f1419',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    border: '#374151',
    borderHover: '#4b5563',
    accent: '#f4d03f',
    accentHover: '#f39c12',
    minimap: '#1a1a2e',
    fog: '#1a1a2e',
    terrainAmbient: 0.4,
  },
  light: {
    bgPrimary: '#f8fafc',
    bgSecondary: '#e2e8f0',
    bgTertiary: '#cbd5e1',
    textPrimary: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    border: '#cbd5e1',
    borderHover: '#94a3b8',
    accent: '#f59e0b',
    accentHover: '#d97706',
    minimap: '#f1f5f9',
    fog: '#e0e7ff',
    terrainAmbient: 0.7,
  },
};

// ============================================================================
// Theme Storage
// ============================================================================

const THEME_STORAGE_KEY = 'agents-of-empire-theme';

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

function saveTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// ============================================================================
// Theme Context
// ============================================================================

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme on mount
  useEffect(() => {
    setThemeState(loadTheme());
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const colors = THEMES[theme];
    document.documentElement.style.setProperty('--bg-primary', colors.bgPrimary);
    document.documentElement.style.setProperty('--bg-secondary', colors.bgSecondary);
    document.documentElement.style.setProperty('--bg-tertiary', colors.bgTertiary);
    document.documentElement.style.setProperty('--text-primary', colors.textPrimary);
    document.documentElement.style.setProperty('--text-secondary', colors.textSecondary);
    document.documentElement.style.setProperty('--text-tertiary', colors.textTertiary);
    document.documentElement.style.setProperty('--border', colors.border);
    document.documentElement.style.setProperty('--accent', colors.accent);

    // Update document class
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    saveTheme(newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
  };

  const value: ThemeContextValue = {
    theme,
    colors: THEMES[theme],
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// ============================================================================
// Theme Toggle Button Component
// ============================================================================

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch
    return (
      <div className="w-12 h-6 rounded-full bg-gray-700" />
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-empire-gold focus:ring-offset-2 focus:ring-offset-gray-900"
      style={{
        backgroundColor: theme === 'dark' ? '#374151' : '#fbbf24',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {/* Toggle slider */}
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-lg flex items-center justify-center text-xs"
        initial={false}
        animate={{
          x: theme === 'dark' ? 0 : 24,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </motion.div>
    </motion.button>
  );
}

// ============================================================================
// Theme Toggle Menu Item (for settings)
// ============================================================================

export function ThemeToggleMenuItem() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
      <div>
        <div className="text-sm font-semibold text-gray-200">Theme</div>
        <div className="text-xs text-gray-400">Choose your interface theme</div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-empire-gold text-gray-900'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🌙 Dark
        </button>
        <button
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            theme === 'light'
              ? 'bg-empire-gold text-gray-900'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ☀️ Light
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Themed Canvas (for 3D scene)
// ============================================================================

export function useThemedCanvas() {
  const { theme, colors } = useTheme();

  return {
    theme,
    fog: colors.fog,
    ambientIntensity: colors.terrainAmbient,
    backgroundColor: colors.bgPrimary,
  };
}
