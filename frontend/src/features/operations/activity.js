import { cloneImmutable } from './helpers.js';
import { DEFAULT_ACTIVITY_HISTORY_LIMIT } from './constants.js';

export const MAX_ACTIVITY_ENTRIES = DEFAULT_ACTIVITY_HISTORY_LIMIT;

function nextActivityId(type = 'event') {
  return `${String(type || 'event').trim() || 'event'}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createActivityEvent(input = {}) {
  return {
    id: String(input.id || nextActivityId(input.type)).trim(),
    type: String(input.type || 'event').trim() || 'event',
    actor: String(input.actor || '').trim(),
    detail: String(input.detail || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function appendActivityEntries(entries = [], event, { maxItems = MAX_ACTIVITY_ENTRIES } = {}) {
  const nextEvent = createActivityEvent(event);
  const current = Array.isArray(entries) ? entries.map((item) => cloneImmutable(item)) : [];
  const next = [...current, nextEvent].sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  return next.slice(Math.max(0, next.length - maxItems));
}

export function summarizeActivityEvent(event = {}) {
  const actor = event.actor ? `${event.actor}: ` : '';
  const detail = event.detail || event.type || 'event';
  return `${actor}${detail}`.trim();
}
