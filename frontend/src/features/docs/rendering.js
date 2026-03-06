const BLOCKED_NODE_NAMES = new Set(['script', 'iframe', 'object', 'embed']);

export function isBlockedNodeName(nodeName) {
  return BLOCKED_NODE_NAMES.has(String(nodeName || '').toLowerCase());
}

export function shouldStripAttribute(name, value) {
  const normalizedName = String(name || '').toLowerCase();
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedName.startsWith('on')) return true;

  return (normalizedName === 'href' || normalizedName === 'src')
    && normalizedValue.startsWith('javascript:');
}

export function sanitizeRenderedHtml(html, doc = globalThis.document) {
  if (!doc?.createElement) return html;

  const template = doc.createElement('template');
  template.innerHTML = html;

  const blockedNodes = template.content.querySelectorAll('script, iframe, object, embed');
  for (const node of blockedNodes) {
    if (isBlockedNodeName(node.nodeName)) {
      node.remove();
    }
  }

  const nodes = template.content.querySelectorAll('*');
  for (const node of nodes) {
    for (const attr of Array.from(node.attributes)) {
      if (shouldStripAttribute(attr.name, attr.value)) {
        node.removeAttribute(attr.name);
      }
    }
  }

  return template.innerHTML;
}
