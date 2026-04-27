import type {
  LegalAudience,
  LegalConsentSubmissionBundle,
  LegalDocumentDefinition,
  LegalFlowKey,
  PendingLegalAcceptance
} from './types.js';

export function filterDocumentsByAudience(
  documents: readonly LegalDocumentDefinition[],
  audience: LegalAudience
): LegalDocumentDefinition[] {
  return documents.filter((document) => document.audience === 'all' || document.audience === audience);
}

export function getDocumentsForFlow(
  documents: readonly LegalDocumentDefinition[],
  flow: LegalFlowKey,
  audience: LegalAudience
): LegalDocumentDefinition[] {
  return filterDocumentsByAudience(documents, audience).filter((document) =>
    document.flowRequirements.some((item) => item.flow === flow)
  );
}

export function getRequiredDocumentsForFlow(
  documents: readonly LegalDocumentDefinition[],
  flow: LegalFlowKey,
  audience: LegalAudience
): LegalDocumentDefinition[] {
  return getDocumentsForFlow(documents, flow, audience).filter((document) =>
    document.flowRequirements.some((item) => item.flow === flow && item.required)
  );
}

export function buildPendingAcceptances(
  documents: readonly LegalDocumentDefinition[],
  flow: LegalFlowKey,
  audience: LegalAudience
): PendingLegalAcceptance[] {
  return getDocumentsForFlow(documents, flow, audience).map((document) => {
    const requirement = document.flowRequirements.find((item) => item.flow === flow);

    return {
      documentId: document.id,
      documentVersion: document.version,
      flow,
      required: Boolean(requirement?.required),
      accepted: false
    };
  });
}

export function buildConsentSubmissionBundle(
  items: PendingLegalAcceptance[],
  flow: LegalFlowKey,
  acceptedAt: string
): LegalConsentSubmissionBundle {
  return {
    flow,
    locale: 'tr-TR',
    acceptedAt,
    items
  };
}
