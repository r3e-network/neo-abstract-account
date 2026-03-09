export const DEFAULT_BROADCAST_MODE = 'client';
export const SUPPORTED_BROADCAST_MODES = ['client', 'relay'];
export const DEFAULT_DRAFT_STATUS = 'draft';

export const DRAFT_METADATA_HISTORY_LIMITS = Object.freeze({
  activity: 100,
  submissionReceipts: 12,
});

export const DEFAULT_ACTIVITY_HISTORY_LIMIT = DRAFT_METADATA_HISTORY_LIMITS.activity;
export const DEFAULT_SUBMISSION_RECEIPT_HISTORY_LIMIT = DRAFT_METADATA_HISTORY_LIMITS.submissionReceipts;
