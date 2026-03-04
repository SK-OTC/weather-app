export function sanitizeSearchTerm(value) {
  const normalized = String(value || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '')
    .slice(0, 100);

  return normalized || undefined;
}
