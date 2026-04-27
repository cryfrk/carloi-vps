'use client';

import { useEffect } from 'react';

import { useSessionStore } from '@/store/session-store';

export function SessionBootstrap() {
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return null;
}
