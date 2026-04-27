'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

import {
  createLegalModalContract,
  LEGAL_PACKAGE_NOTICE,
  type LegalDocumentDefinition,
  type LegalFlowKey,
} from '@carloi-v3/legal';

import { fixMojibake } from '@/lib/mojibake';

interface LegalModalProps {
  open: boolean;
  document: LegalDocumentDefinition | null;
  flow: LegalFlowKey;
  onClose: () => void;
  onAccept: (documentId: string, version: string) => void;
}

export function LegalModal({ open, document, flow, onClose, onAccept }: LegalModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrolledEnough, setScrolledEnough] = useState(false);

  const contract = useMemo(
    () => (document ? createLegalModalContract(document, flow) : null),
    [document, flow],
  );

  useEffect(() => {
    if (open) {
      setScrolledEnough(false);
    }
  }, [open, contract?.document.id]);

  if (!open || !contract) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.32)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <div className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              Surum {contract.document.version}
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              {fixMojibake(contract.modalTitle)}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {fixMojibake(contract.document.summary)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          onScroll={(event) => {
            const target = event.currentTarget;
            const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
            if (nearBottom) {
              setScrolledEnough(true);
            }
          }}
          className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-6"
        >
          <div className="rounded-[24px] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {fixMojibake(LEGAL_PACKAGE_NOTICE)}
          </div>
          {contract.document.sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <h4 className="text-lg font-black text-slate-950">{fixMojibake(section.heading)}</h4>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.id}-${index}`} className="text-sm leading-7 text-slate-600">
                    {fixMojibake(paragraph)}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">
            Kaydi tamamlamak icin bu metni sonuna kadar inceleyip onaylaman gerekir.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={contract.primaryAction.disabledUntilScrolled && !scrolledEnough}
              onClick={() => onAccept(contract.document.id, contract.document.version)}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Kabul et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
