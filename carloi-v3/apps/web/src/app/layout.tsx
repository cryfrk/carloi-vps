import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Carloi V3 Web',
  description: 'Carloi V3 premium sosyal otomotiv deneyimi',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
