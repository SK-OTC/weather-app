import { supabase } from './supabase.js';
import { unauthorizedError } from './errors.js';

function extractBearerToken(req) {
  const header = req.get('authorization') || req.get('Authorization');
  if (!header) return null;
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function getOptionalAuthenticatedUserId(req) {
  const token = extractBearerToken(req);
  if (!token) return undefined;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw unauthorizedError('Invalid or expired authentication token.');
  }

  return data.user.id;
}

export async function getRequiredAuthenticatedUserId(req) {
  const userId = await getOptionalAuthenticatedUserId(req);
  if (!userId) {
    throw unauthorizedError('Authentication is required for this action.');
  }
  return userId;
}
