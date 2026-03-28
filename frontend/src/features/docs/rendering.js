const BLOCKED_NODE_NAMES = new Set(['script', 'iframe', 'object', 'embed', 'base', 'form', 'meta', 'svg', 'math', 'template', 'style', 'link', 'noscript']);

export function isBlockedNodeName(nodeName) {
  return BLOCKED_NODE_NAMES.has(String(nodeName || '').toLowerCase());
}

export function shouldStripAttribute(name, value) {
  const normalizedName = String(name || '').toLowerCase();
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedName.startsWith('on')) return true;
  if (normalizedName === 'style') return true;

  if (normalizedName === 'href' || normalizedName === 'src' || normalizedName === 'action') {
    const stripped = normalizedValue.replace(/[\x00-\x1f\x7f]/g, '');
    if (stripped.startsWith('javascript:') || stripped.startsWith('data:') || stripped.startsWith('vbscript:')) {
      return true;
    }
  }

  return false;
}

export function sanitizeRenderedHtml(html, doc = globalThis.document) {
  if (!doc?.createElement) return html;

  const template = doc.createElement('template');
  template.innerHTML = html;

  const blockedNodes = template.content.querySelectorAll('script, iframe, object, embed, base, form, meta, svg, math, template, style, link, noscript');
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
