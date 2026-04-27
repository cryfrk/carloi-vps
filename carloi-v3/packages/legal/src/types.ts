export type LegalAudience = 'all' | 'individual' | 'commercial' | 'admin';

export type LegalDocumentKind =
  | 'contract'
  | 'privacy-notice'
  | 'policy'
  | 'explicit-consent'
  | 'responsibility-notice'
  | 'feature-notice';

export type LegalFlowKey =
  | 'register-individual'
  | 'register-commercial'
  | 'create-listing'
  | 'commercial-onboarding'
  | 'messaging-safe-transaction'
  | 'obd-onboarding'
  | 'ai-session'
  | 'insurance-quote';

export interface LegalDocumentSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface LegalFlowRequirement {
  flow: LegalFlowKey;
  required: boolean;
  blocksCompletion: boolean;
  suggestedEntryPoint: string;
}

export interface LegalDocumentDefinition {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  kind: LegalDocumentKind;
  audience: LegalAudience;
  version: string;
  locale: 'tr-TR';
  updatedAt: string;
  legalReviewRequired: true;
  summary: string;
  tags: string[];
  flowRequirements: LegalFlowRequirement[];
  sections: LegalDocumentSection[];
}

export type ConsentCaptureMethod =
  | 'checkbox'
  | 'modal-accept'
  | 'feature-gate'
  | 'step-confirmation'
  | 'server-side-import';

export interface UserLegalAcceptanceRecord {
  id: string;
  userId: string;
  documentId: string;
  documentVersion: string;
  locale: 'tr-TR';
  acceptedAt: string;
  flow: LegalFlowKey;
  sourceScreen: string;
  method: ConsentCaptureMethod;
  legalReviewRequired: true;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PendingLegalAcceptance {
  documentId: string;
  documentVersion: string;
  flow: LegalFlowKey;
  required: boolean;
  accepted: boolean;
  acceptedAt?: string;
}

export interface LegalConsentSubmissionBundle {
  flow: LegalFlowKey;
  locale: 'tr-TR';
  acceptedAt: string;
  items: PendingLegalAcceptance[];
}
