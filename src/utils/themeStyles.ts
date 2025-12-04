export type Theme = 'light' | 'dark' | 'sepia';

export interface ThemeStyle {
  bg: string;
  text: string;
  cardBg: string;
  cardBorder: string;
  separator: string;
  inputBg: string;
  inputBorder: string;
  buttonBg: string;
  secondaryText: string;
  progressBg: string;
}

export const themeStyles: Record<Theme, ThemeStyle> = {
  light: {
    bg: '#fff',
    text: '#333',
    cardBg: '#fff',
    cardBorder: '#e0e0e0',
    separator: '#e0e0e0',
    inputBg: '#fff',
    inputBorder: '#ddd',
    buttonBg: '#f8f9fa',
    secondaryText: '#666',
    progressBg: '#e0e0e0',
  },
  dark: {
    bg: '#1a1a1a',
    text: '#e0e0e0',
    cardBg: '#2a2a2a',
    cardBorder: '#444',
    separator: '#444',
    inputBg: '#2a2a2a',
    inputBorder: '#555',
    buttonBg: '#333',
    secondaryText: '#aaa',
    progressBg: '#444',
  },
  sepia: {
    bg: '#f4ecd8',
    text: '#5c4b37',
    cardBg: '#f9f5ed',
    cardBorder: '#d4c4a8',
    separator: '#d4c4a8',
    inputBg: '#f9f5ed',
    inputBorder: '#c4b59a',
    buttonBg: '#e8ddd0',
    secondaryText: '#7a6b55',
    progressBg: '#d4c4a8',
  },
};

