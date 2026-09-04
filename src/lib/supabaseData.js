import { supabaseAuth, getStoredSession } from "@/lib/supabaseClient";

const SUPABASE_URL = "https://rixigicvtaldlpsrwlph.supabase.co";
const SUPABASE_KEY = "sb_publishable_K5JnEZEbxBzzOkapVdNWgA_0V1pqt7q";

async function supabaseRest(path, options = {}) {
  const session = getStoredSession();
  const token = session?.access_token;
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Supabase database request failed");
  }
  return data;
}

export async function createAssessmentResponse({ age, answers, result, nationality }) {
  const session = getStoredSession();
  if (!session?.access_token) return null;

  const row = {
    user_id: result?.user_id || null,
    age: Number.isFinite(Number(age)) ? Number(age) : null,
    age_group: Number(age) < 20 ? "under20" : "over20",
    nationality: nationality || "thai",
    answers: Array.isArray(answers) ? answers : [],
    risk_level: result?.risk_level || null,
    risk_score: result?.risk_score ?? null,
    ai_summary: result?.ai_summary || "",
    recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [],
  };

  // Supabase uses the authenticated session identity for RLS.
  const user = await supabaseAuth("/user", { method: "GET", token: session.access_token });
  row.user_id = user?.id;
  if (!row.user_id) return null;

  const data = await supabaseRest("/assessment_responses", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function listAssessmentResponses(limit = 200) {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  return supabaseRest(
    `/assessment_responses?select=id,age,age_group,nationality,answers,risk_level,risk_score,ai_summary,recommendations,created_at&order=created_at.desc&limit=${safeLimit}`
  );
}
