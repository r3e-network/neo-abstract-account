const COLLABORATOR_ACCESS_QUERY_PARAM = 'access';

export function buildDraftSharePath(draftId, basePath = '/tx') {
  return `${basePath}/${encodeURIComponent(draftId)}`;
}

export function buildDraftShareUrl(origin, draftId, basePath = '/tx') {
  const normalizedOrigin = String(origin || '').replace(/\/$/, '');
  return `${normalizedOrigin}${buildDraftSharePath(draftId, basePath)}`;
}

export function buildDraftCollaborationPath(draftId, collaborationSlug, basePath = '/tx') {
  const sharePath = buildDraftSharePath(draftId, basePath);
  const params = new URLSearchParams({
    [COLLABORATOR_ACCESS_QUERY_PARAM]: String(collaborationSlug || ''),
  });
  return `${sharePath}?${params.toString()}`;
}

export function buildDraftCollaborationUrl(origin, draftId, collaborationSlug, basePath = '/tx') {
  const normalizedOrigin = String(origin || '').replace(/\/$/, '');
  return `${normalizedOrigin}${buildDraftCollaborationPath(draftId, collaborationSlug, basePath)}`;
}

export { COLLABORATOR_ACCESS_QUERY_PARAM };
