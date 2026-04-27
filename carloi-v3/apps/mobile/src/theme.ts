import { designTokens } from '@carloi-v3/ui';

export const theme = {
  colors: {
    ...designTokens.colors,
    textSoft: '#334155',
    surfaceMuted: '#f1f5f9',
    overlay: 'rgba(15, 23, 42, 0.5)',
  },
  spacing: designTokens.spacing,
  radius: designTokens.radius,
  shadow: {
    card: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  },
} as const;
