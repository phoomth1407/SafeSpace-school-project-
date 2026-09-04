const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const authHeaders = (token) => ({
  apikey: SUPABASE_KEY,
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export async function supabaseAuth(path, options = {}) {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...options,
    headers: {
      ...authHeaders(options.token),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.msg || data.error_description || data.message || 'Authentication request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function signInWithPassword(email, password) {
  return supabaseAuth('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signUpWithPassword(email, password, emailRedirectTo) {
  return supabaseAuth('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      ...(emailRedirectTo ? { options: { email_redirect_to: emailRedirectTo } } : {}),
    }),
  });
}

export async function getCurrentUser(token) {
  return supabaseAuth('/user', { method: 'GET', token });
}

export async function signOut(token) {
  if (!supabaseConfigured || !token) return;
  await supabaseAuth('/logout', { method: 'POST', token });
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('safespace_session') || 'null');
  } catch {
    return null;
  }
}

export function storeSession(session) {
  if (session) localStorage.setItem('safespace_session', JSON.stringify(session));
  else localStorage.removeItem('safespace_session');
}

export function getOAuthUrl(provider, redirectTo) {
  if (!supabaseConfigured) return null;
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
  });
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}
