import type { LegalDocumentDefinition, LegalFlowKey } from './types.js';

export interface LegalModalPrimaryAction {
  id: 'accept';
  label: 'Kabul et';
  disabledUntilScrolled: boolean;
}

export interface LegalModalSecondaryAction {
  id: 'close';
  label: 'Kapat';
}

export interface LegalModalContract {
  document: LegalDocumentDefinition;
  flow: LegalFlowKey;
  modalTitle: string;
  scrollRequired: boolean;
  showVersionBadge: boolean;
  showUpdatedAt: boolean;
  showLegalReviewNotice: boolean;
  primaryAction: LegalModalPrimaryAction;
  secondaryAction: LegalModalSecondaryAction;
  blocksFlowCompletion: boolean;
}

export function createLegalModalContract(
  document: LegalDocumentDefinition,
  flow: LegalFlowKey
): LegalModalContract {
  const flowRequirement = document.flowRequirements.find((item) => item.flow === flow);

  return {
    document,
    flow,
    modalTitle: document.title,
    scrollRequired: true,
    showVersionBadge: true,
    showUpdatedAt: true,
    showLegalReviewNotice: true,
    primaryAction: {
      id: 'accept',
      label: 'Kabul et',
      disabledUntilScrolled: true
    },
    secondaryAction: {
      id: 'close',
      label: 'Kapat'
    },
    blocksFlowCompletion: Boolean(flowRequirement?.blocksCompletion)
  };
}
