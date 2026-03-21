import {
  buildRelayPreflightExport,
  serializeRelayPreflightPayload,
  serializeRelayPreflightStack,
} from './relayPreflightActions.js';

export async function copyTextToClipboard(value, { clipboard = globalThis.navigator?.clipboard } = {}) {
  if (!value || !clipboard?.writeText) return false;
  await clipboard.writeText(String(value));
  return true;
}

export function openExternalUrl(url, { windowRef = globalThis.window } = {}) {
  if (!url || !windowRef?.open) return false;
  windowRef.open(String(url), '_blank', 'noopener,noreferrer');
  return true;
}

export function downloadJsonFile(
  json,
  {
    filename = 'download.json',
    documentRef = globalThis.document,
    urlApi = globalThis.URL,
  } = {},
) {
  if (!json || !documentRef?.createElement || !urlApi?.createObjectURL || !urlApi?.revokeObjectURL) {
    return false;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const objectUrl = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click?.();
  urlApi.revokeObjectURL(objectUrl);
  return true;
}

export async function runDraftSummaryAction(
  action,
  {
    clipboard = globalThis.navigator?.clipboard,
    windowRef = globalThis.window,
    setStatus,
    t,
  } = {},
) {
  if (!action) return false;

  if (action.id === 'open-url' && action.url) {
    const opened = openExternalUrl(action.url, { windowRef });
    if (!opened) return false;
    setStatus?.(t ? t('operations.openedExplorerLink', 'Opened explorer link.') : 'Opened explorer link.');
    return true;
  }

  if (!action.value) return false;
  const copied = await copyTextToClipboard(action.value, { clipboard });
  if (!copied) return false;

  setStatus?.(t ? `${action.label} ${t('operations.copiedToClipboard', 'copied to clipboard.')}` : `${action.label} copied to clipboard.`);
  return true;
}

export async function runDraftActivityAction(
  action,
  {
    clipboard = globalThis.navigator?.clipboard,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    setStatus,
    t,
  } = {},
) {
  if (!action) return false;

  if (action.id === 'copy-share' && action.value) {
    const copied = await copyTextToClipboard(action.value, { clipboard });
    if (!copied) return false;
    setStatus?.(t ? t('operations.shareLinkCopied', 'Share link copied to clipboard.') : 'Share link copied to clipboard.');
    return true;
  }

  if (action.id === 'copy-txid' && action.value) {
    const copied = await copyTextToClipboard(action.value, { clipboard });
    if (!copied) return false;
    setStatus?.(t ? t('operations.txidCopied', 'Transaction ID copied to clipboard.') : 'Transaction ID copied to clipboard.');
    return true;
  }

  if (action.id === 'open-url' && action.url) {
    const opened = openExternalUrl(action.url, { windowRef });
    if (!opened) return false;
    setStatus?.(t ? t('operations.openedExplorerLink', 'Opened explorer link.') : 'Opened explorer link.');
    return true;
  }

  if (action.id === 'jump-relay' && action.targetId) {
    const target = documentRef?.getElementById?.(action.targetId);
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    setStatus?.(t ? t('operations.jumpedToRelay', 'Jumped to relay preflight.') : 'Jumped to relay preflight.');
    return true;
  }

  return false;
}

export function createDraftInteractionHandlers({
  getRelayCheck,
  getRelayRequest,
  setStatus,
  t,
  clipboard = globalThis.navigator?.clipboard,
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
  windowRef = globalThis.window,
} = {}) {
  return {
    async copyRelayPayload() {
      const payload = serializeRelayPreflightPayload(getRelayRequest?.());
      const copied = await copyTextToClipboard(payload, { clipboard });
      if (!copied) return false;
      setStatus?.(t ? t('operations.relayPayloadCopied', 'Relay payload copied to clipboard.') : 'Relay payload copied to clipboard.');
      return true;
    },
    async copyRelayStack() {
      const stackItems = getRelayCheck?.()?.stack || [];
      if (!Array.isArray(stackItems) || stackItems.length === 0) return false;
      const stack = serializeRelayPreflightStack(stackItems);
      const copied = await copyTextToClipboard(stack, { clipboard });
      if (!copied) return false;
      setStatus?.(t ? t('operations.relayStackCopied', 'Decoded relay stack copied to clipboard.') : 'Decoded relay stack copied to clipboard.');
      return true;
    },
    exportRelayPreflight() {
      const json = JSON.stringify(
        buildRelayPreflightExport({
          relayCheck: getRelayCheck?.(),
          relayRequest: getRelayRequest?.(),
        }),
        null,
        2,
      );
      const exported = downloadJsonFile(json, {
        filename: 'relay-preflight.json',
        documentRef,
        urlApi,
      });
      if (!exported) return false;
      setStatus?.(t ? t('operations.relayPreflightExported', 'Relay preflight JSON exported.') : 'Relay preflight JSON exported.');
      return true;
    },
    async handleSummaryAction({ action } = {}) {
      return runDraftSummaryAction(action, { clipboard, windowRef, setStatus, t });
    },
    async handleActivityAction({ action } = {}) {
      return runDraftActivityAction(action, { clipboard, documentRef, windowRef, setStatus, t });
    },
  };
}
