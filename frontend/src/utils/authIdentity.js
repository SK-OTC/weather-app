const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const LEGACY_USERNAME_DOMAINS = ['auth.local', 'auth.example.com'];

function getProjectAuthDomain() {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!rawUrl) return 'example.org';

  try {
    const { hostname } = new URL(rawUrl);
    return hostname || 'example.org';
  } catch {
    return 'example.org';
  }
}

const USERNAME_DOMAIN = getProjectAuthDomain();

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidUsername(value) {
  return USERNAME_REGEX.test(normalizeUsername(value));
}

export function usernameToAuthEmail(value) {
  const username = normalizeUsername(value);
  return `${username}@${USERNAME_DOMAIN}`;
}

export function usernameToLegacyAuthEmail(value) {
  const username = normalizeUsername(value);
  return `${username}@${LEGACY_USERNAME_DOMAINS[0]}`;
}

export function usernameToLegacyAuthEmails(value) {
  const username = normalizeUsername(value);
  return LEGACY_USERNAME_DOMAINS.map((domain) => `${username}@${domain}`);
}
