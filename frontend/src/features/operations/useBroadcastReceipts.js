import { computed, ref } from 'vue';
import {
  buildSubmissionReceipt,
  resolveLatestSubmissionReceipt,
} from './submissionFeedback.js';
import {
  buildSubmissionReceiptHistoryItems,
  createSubmissionReceiptEntry,
} from './submissionReceipts.js';

/**
 * Submission-receipt state for the home workspace: the in-flight action flag,
 * the active receipt card, and the formatted receipt history. The persisted
 * receipt log (`submissionReceiptEntries`) is owned by useDraftPersistence and
 * threaded in so the active/history derivations stay in sync with it.
 *
 * `setSubmissionPending` marks an action in-flight and shows its pending card;
 * `setSubmissionResult` clears the pending flag, swaps in the finished card,
 * and returns the receipt entry the caller persists through useDraftPersistence
 * (the broadcast/relay flows pass it to `persistSubmissionReceipt`).
 */
export function useBroadcastReceipts({ submissionReceiptEntries, explorerBaseUrl, t }) {
  const pendingSubmissionAction = ref('');
  const submissionReceipt = ref(null);

  const isSubmissionPending = computed(() =>
    Boolean(pendingSubmissionAction.value),
  );
  const submissionReceiptHistoryItems = computed(() =>
    buildSubmissionReceiptHistoryItems(submissionReceiptEntries.value, {
      explorerBaseUrl,
      limit: 4,
      t,
    }),
  );
  const activeSubmissionReceipt = computed(
    () =>
      submissionReceipt.value ||
      resolveLatestSubmissionReceipt(submissionReceiptEntries.value, {
        explorerBaseUrl,
        t,
      }),
  );

  function setSubmissionPending(action) {
    pendingSubmissionAction.value = action;
    submissionReceipt.value = buildSubmissionReceipt({
      action,
      phase: 'pending',
      explorerBaseUrl,
      t,
    });
  }

  function setSubmissionResult(
    action,
    { phase = 'success', detail = '', txid = '' } = {},
  ) {
    pendingSubmissionAction.value = '';
    const entry = createSubmissionReceiptEntry({ action, phase, detail, txid });
    submissionReceipt.value = buildSubmissionReceipt({
      action,
      phase,
      detail,
      txid,
      explorerBaseUrl,
      t,
    });
    return entry;
  }

  return {
    pendingSubmissionAction,
    submissionReceipt,
    isSubmissionPending,
    submissionReceiptHistoryItems,
    activeSubmissionReceipt,
    setSubmissionPending,
    setSubmissionResult,
  };
}
