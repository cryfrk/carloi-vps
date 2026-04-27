'use client';

import type { ReactNode } from 'react';

import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';
import { CreateComposerModal } from '@/components/create-composer-modal';
import { FloatingIslandDock } from '@/components/floating-island-dock';
import { RightRail } from '@/components/right-rail';
import { SessionBootstrap } from '@/components/session-bootstrap';
import { StateBlock } from '@/components/state-block';

interface PageShellProps {
  children: ReactNode;
  showRail?: boolean;
  showDock?: boolean;
}

export function PageShell({ children, showRail = true, showDock = true }: PageShellProps) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const error = useSessionStore((state) => state.error);
  const clearError = useSessionStore((state) => state.clearError);
  const createModalOpen = useUiStore((state) => state.createModalOpen);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,254,255,0.9),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)] pb-40">
      <SessionBootstrap />
      <div className="mx-auto flex w-full max-w-app gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          {error ? (
            <div className="mb-6">
              <StateBlock
                title={error.title}
                description={error.description}
                actionLabel="Kapat"
                onAction={clearError}
              />
            </div>
          ) : null}
          {children}
        </div>
        {showRail ? <div className="hidden w-[320px] shrink-0 xl:block"><RightRail snapshot={snapshot} /></div> : null}
      </div>
      {createModalOpen ? <CreateComposerModal /> : null}
      {showDock ? <FloatingIslandDock /> : null}
    </div>
  );
}
