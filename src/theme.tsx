import React, { createContext, useContext, useEffect, useState } from 'react';

// Flip to false once you pick your preferred workshop color theme.
export const ENABLE_THEME_SWATCH_DEBUG = true;

export type ThemeId =
  | 'biu-navy'
  | 'clinical-teal'
  | 'forest-emerald'
  | 'warm-terracotta'
  | 'ink-slate';

export interface ThemeOption {
  id: ThemeId;
  labelHe: string;
  labelEn: string;
  swatchHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'biu-navy', labelHe: 'כחול אקדמי (BIU)', labelEn: 'Academic Navy', swatchHex: '#1d4ed8' },
  { id: 'clinical-teal', labelHe: 'טורקיז קליני', labelEn: 'Clinical Teal', swatchHex: '#0d9488' },
  { id: 'forest-emerald', labelHe: 'ירוק מעבדה', labelEn: 'Lab Emerald', swatchHex: '#059669' },
  { id: 'warm-terracotta', labelHe: 'כתום חם', labelEn: 'Warm Terracotta', swatchHex: '#c2410c' },
  { id: 'ink-slate', labelHe: 'גרפיט מינימלי', labelEn: 'Ink Slate', swatchHex: '#1e293b' },
];

const THEME_STORAGE_KEY = 'bci_hub_theme';
const FONT_SCALE_STORAGE_KEY = 'bci_hub_font_scale';
const DEFAULT_FONT_SCALE = 105;
const MIN_FONT_SCALE = 85;
const MAX_FONT_SCALE = 135;
const FONT_STEP = 10;

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  fontScale: number;
  increaseFont: () => void;
  decreaseFont: () => void;
  canIncreaseFont: boolean;
  canDecreaseFont: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    return THEME_OPTIONS.some((o) => o.id === saved) ? (saved as ThemeId) : 'biu-navy';
  });

  const [fontScale, setFontScale] = useState<number>(() => {
    const raw = Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY));
    if (!Number.isNaN(raw) && raw >= MIN_FONT_SCALE && raw <= MAX_FONT_SCALE) {
      return raw;
    }
    return DEFAULT_FONT_SCALE;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    // 16px * fontScale% -> default 105% ≈ 16.8px for crisp readability.
    document.documentElement.style.fontSize = `${(16 * fontScale) / 100}px`;
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(fontScale));
  }, [fontScale]);

  const setTheme = (next: ThemeId) => setThemeState(next);
  const increaseFont = () =>
    setFontScale((prev) => Math.min(MAX_FONT_SCALE, prev + FONT_STEP));
  const decreaseFont = () =>
    setFontScale((prev) => Math.max(MIN_FONT_SCALE, prev - FONT_STEP));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontScale,
        increaseFont,
        decreaseFont,
        canIncreaseFont: fontScale < MAX_FONT_SCALE,
        canDecreaseFont: fontScale > MIN_FONT_SCALE,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
