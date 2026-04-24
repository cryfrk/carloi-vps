export const theme = {
  colors: {
    background: '#F4F7F8',
    surface: '#FFFFFF',
    surfaceMuted: '#ECF1F2',
    card: '#FFFFFF',
    text: '#101820',
    textSoft: '#64707D',
    border: '#DDE5E8',
    primary: '#0D8A86',
    primarySoft: '#E6F8F7',
    secondary: '#F59E0B',
    accent: '#183542',
    success: '#1D9A6C',
    warning: '#D97706',
    danger: '#DC4C64',
    shadow: 'rgba(16, 24, 32, 0.08)',
    overlay: 'rgba(16, 24, 32, 0.36)',
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
  },
  shadow: {
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
};

export const mediaToneMap = {
  cyan: {
    background: '#D7F3EF',
    foreground: '#0B7A75',
  },
  amber: {
    background: '#FFE5D0',
    foreground: '#B4631B',
  },
  coral: {
    background: '#FFD9D4',
    foreground: '#A34848',
  },
  slate: {
    background: '#DDE5EC',
    foreground: '#244A6A',
  },
  emerald: {
    background: '#DBF2E0',
    foreground: '#2A8E5C',
  },
} as const;

export const typeScale = {
  hero: 30,
  title: 24,
  subtitle: 19,
  body: 15,
  caption: 12,
};
