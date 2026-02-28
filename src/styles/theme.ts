/**
 * Triumph Socks — Design System: Color Tokens & Theme
 * All application colors are defined here and imported everywhere.
 * Modify this file to retheme the entire application.
 */

export const colors = {
  /* ── Brand Palette ─────────────────────────────────────── */
  brand: {
    50:  '#fdf4e7',
    100: '#fae4c2',
    200: '#f5c880',
    300: '#f0ab3e',
    400: '#e8901e',
    500: '#d4730a', // primary brand
    600: '#b55e06',
    700: '#8f4904',
    800: '#6a3403',
    900: '#451f01',
  },
  /* ── Neutral / Gray ─────────────────────────────────────── */
  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  /* ── Semantic Colors ────────────────────────────────────── */
  success: {
    50:  '#f0fdf4',
    500: '#22c55e',
    700: '#15803d',
  },
  warning: {
    50:  '#fffbeb',
    500: '#f59e0b',
    700: '#b45309',
  },
  danger: {
    50:  '#fef2f2',
    500: '#ef4444',
    700: '#b91c1c',
  },
  info: {
    50:  '#eff6ff',
    500: '#3b82f6',
    700: '#1d4ed8',
  },
  purple: {
    50:  '#faf5ff',
    500: '#a855f7',
    700: '#7e22ce',
  },
  /* ── Surface / Background ───────────────────────────────── */
  surface: {
    light:    '#ffffff',
    lightAlt: '#f9fafb',
    dark:     '#111827',
    darkAlt:  '#1f2937',
    card:     '#ffffff',
    cardDark: '#1f2937',
  },
  /* ── Text ───────────────────────────────────────────────── */
  text: {
    primary:   '#111827',
    secondary:  '#6b7280',
    muted:      '#9ca3af',
    inverse:   '#ffffff',
    darkPrimary: '#f9fafb',
    darkSecondary:'#d1d5db',
  },
  /* ── Border ─────────────────────────────────────────────── */
  border: {
    light: '#e5e7eb',
    dark:  '#374151',
  },
} as const;

/** CSS custom property names mapped to values for use in global CSS */
export const cssVars = {
  light: {
    '--color-bg':        colors.surface.lightAlt,
    '--color-surface':   colors.surface.light,
    '--color-border':    colors.border.light,
    '--color-text':      colors.text.primary,
    '--color-text-muted':colors.text.secondary,
    '--color-brand':     colors.brand[500],
    '--color-brand-light':colors.brand[100],
    '--color-sidebar-bg':'#1a1f2e',
    '--color-sidebar-text':'#d1d5db',
    '--color-sidebar-active':'#d4730a',
  },
  dark: {
    '--color-bg':        '#0b1120',
    '--color-surface':   '#0f172a',
    '--color-border':    '#334155',
    '--color-text':      '#e2e8f0',
    '--color-text-muted':'#94a3b8',
    '--color-brand':     colors.brand[400],
    '--color-brand-light':colors.brand[900],
    '--color-sidebar-bg':'#090e1a',
    '--color-sidebar-text':'#94a3b8',
    '--color-sidebar-active':'#fbbf24',
  },
} as const;

/** Tailwind class utilities derived from brand theme */
export const tw = {
  brand:   'text-amber-700 dark:text-amber-400',
  brandBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
  cardBg:  'bg-white dark:bg-gray-800',
  surface: 'bg-gray-50 dark:bg-gray-900',
  border:  'border-gray-200 dark:border-gray-700',
  text:    'text-gray-900 dark:text-gray-100',
  textMuted:'text-gray-500 dark:text-gray-400',
} as const;

export type ThemeMode = 'light' | 'dark';
