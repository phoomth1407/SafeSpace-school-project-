// Browser-safe Supabase configuration.
// Publishable keys may be used in browser code. Never put a secret/service key here.
const DEFAULT_APP_URL = 'https://phoomth1407.github.io/SafeSpace-school-project-';

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://rixigicvtaldlpsrwlph.supabase.co'
).replace(/\/$/, '');

const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_K5JnEZEbxBzzOkapVdNWgA_0V1pqt7q'
);

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
// Use the GitHub Pages app root for auth callbacks so OAuth never lands on a
// direct /login URL that GitHub Pages may treat as a missing static file.
export const AUTH_REDIRECT_URL = `${DEFAULT_APP_URL}/`;

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

function normalizeSession(session) {
  if (!session?.access_token) return session;
  return {
    ...session,
    expires_at: session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined),
  };
}

export async function signInWithPassword(email, password) {
  return normalizeSession(await supabaseAuth('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));
}

export async function signUpWithPassword(email, password, emailRedirectTo = AUTH_REDIRECT_URL) {
  return normalizeSession(await supabaseAuth('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      options: { email_redirect_to: emailRedirectTo },
    }),
  }));
}

export async function refreshSession(refreshToken) {
  return normalizeSession(await supabaseAuth('/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }));
}

export async function getCurrentUser(token) {
  return supabaseAuth('/user', { method: 'GET', token });
}

export async function requestPasswordReset(email, redirectTo = AUTH_REDIRECT_URL) {
  return supabaseAuth('/recover', {
    method: 'POST',
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
}

export async function updatePassword(token, password) {
  return supabaseAuth('/user', {
    method: 'PUT',
    token,
    body: JSON.stringify({ password }),
  });
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
  if (session) localStorage.setItem('safespace_session', JSON.stringify(normalizeSession(session)));
  else localStorage.removeItem('safespace_session');
}

export function getAuthTokensFromUrl() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return normalizeSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: params.get('token_type') || 'bearer',
    expires_in: Number(params.get('expires_in') || 3600),
    type: params.get('type') || null,
  });
}

export function getAuthErrorFromUrl() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const error = params.get('error');
  const errorCode = params.get('error_code');
  const description = params.get('error_description');
  if (!error && !errorCode && !description) return null;
  return {
    error,
    errorCode,
    message: description || errorCode || error || 'Authentication failed',
  };
}

export function clearAuthHash() {
  if (!window.location.hash) return;
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
}

export function getOAuthUrl(provider, redirectTo = AUTH_REDIRECT_URL) {
  if (!supabaseConfigured) return null;
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    flow_type: 'implicit',
  });
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

export async function invokeAssessmentAI({ answers, language, age, nationality, token }) {
  if (!supabaseConfigured) throw new Error('Supabase is not configured yet.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-assessment`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ answers, language, age, nationality }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'AI analysis failed.');
  return data;
}

export async function saveAssessmentResponse({ result, answers, age, nationality, token, userId }) {
  if (!token || !userId) return null;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/assessment_responses`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      age: Number.isFinite(Number(age)) ? Number(age) : null,
      age_group: Number(age) < 20 ? 'under20' : 'over20',
      nationality: nationality === 'foreigner' ? 'foreigner' : 'thai',
      answers,
      risk_level: result.risk_level,
      risk_score: result.risk_score,
      ai_summary: result.ai_summary,
      recommendations: result.recommendations || [],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.hint || 'Could not save assessment result.');
  return Array.isArray(data) ? data[0] : data;
}
