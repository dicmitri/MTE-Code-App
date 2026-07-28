function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function resolveResourceLinks(html, resourceLinks = {}) {
  return String(html || '').replace(
    /href=(["'])resource:([a-z0-9-]+)\1/gi,
    (match, quote, resourceId) => {
      const resource = resourceLinks[resourceId];
      if (!resource?.url) return match;

      const url = escapeHtmlAttribute(resource.url);
      const downloadAttribute = resource.filename
        ? ` download="${escapeHtmlAttribute(resource.filename)}"`
        : '';

      return `href="${url}"${downloadAttribute}`;
    },
  );
}
