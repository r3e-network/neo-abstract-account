import { ref } from 'vue';
import { appendActivityEntries } from './activity.js';
import { appendSubmissionReceiptEntries } from './submissionReceipts.js';

/**
 * Draft bookkeeping for the home workspace: local-first activity and
 * submission-receipt state with best-effort remote sync through the draft
 * store. Remote failures never surface to the user — the local entry is
 * already applied and a broadcast that succeeded on-chain must not be
 * reported as an error (see the persistSubmissionReceipt pattern from
 * AA-W1-05).
 */
export function useDraftPersistence({
  draftStore,
  getShareSlug,
  getAccessMutationOptions,
  getOperatorMutationOptions,
  devWarnTag = 'useDraftPersistence',
}) {
  const activityItems = ref([]);
  const submissionReceiptEntries = ref([]);

  function warnSyncFailure(operation) {
    if (import.meta.env?.DEV) {
      console.warn(`[${devWarnTag}] ${operation} sync failed`);
    }
  }

  async function appendActivity(event) {
    activityItems.value = appendActivityEntries(activityItems.value, event);
    const shareSlug = getShareSlug();
    if (!shareSlug) return;
    try {
      const record = await draftStore.appendActivity(
        shareSlug,
        event,
        getAccessMutationOptions(),
      );
      activityItems.value = record.metadata?.activity || activityItems.value;
    } catch (_) {
      warnSyncFailure('appendActivity');
    }
  }

  async function persistSubmissionReceipt(entry) {
    submissionReceiptEntries.value = appendSubmissionReceiptEntries(
      submissionReceiptEntries.value,
      entry,
    );
    const shareSlug = getShareSlug();
    if (!shareSlug) return;
    try {
      const record = await draftStore.appendSubmissionReceipt(
        shareSlug,
        entry,
        getOperatorMutationOptions(),
      );
      submissionReceiptEntries.value =
        record.metadata?.submissionReceipts || submissionReceiptEntries.value;
    } catch (_) {
      warnSyncFailure('persistSubmissionReceipt');
    }
  }

  return {
    activityItems,
    submissionReceiptEntries,
    appendActivity,
    persistSubmissionReceipt,
  };
}
