import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createAssessmentResponse, listAssessmentResponses } from '@/lib/supabaseData';
import { getStoredSession, supabaseAuth } from '@/lib/supabaseClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Base44 is kept as a compatibility layer while the remaining app services are migrated.
// Survey results are mirrored into Supabase so the admin dashboard can work independently.
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const originalInvoke = client.functions?.invoke?.bind(client.functions);
if (originalInvoke) {
  client.functions.invoke = async (name, body = {}) => {
    const response = await originalInvoke(name, body);

    if (name === 'analyzeAssessment') {
      try {
        const session = getStoredSession();
        if (session?.access_token && response?.data && !response.data?.is_guest) {
          await createAssessmentResponse({
            age: body.age,
            answers: body.answers,
            result: response.data,
            nationality: body.nationality,
          });
        }
      } catch (storageError) {
        // Saving the analysis to Supabase should never block the user's result page.
        console.warn('Could not mirror assessment to Supabase:', storageError);
      }
    }

    return response;
  };
}

// The old Admin page asked Base44 for assessment records. Replace that one read with
// Supabase data when an authenticated admin loads the page.
const originalAssessmentList = client.entities?.Assessment?.list?.bind(client.entities.Assessment);
if (originalAssessmentList) {
  client.entities.Assessment.list = async (...args) => {
    try {
      const session = getStoredSession();
      if (!session?.access_token) return [];
      const user = await supabaseAuth('/user', { method: 'GET', token: session.access_token });
      const role = user?.user_metadata?.role || user?.app_metadata?.role;
      if (role === 'admin') return await listAssessmentResponses(200);
    } catch (error) {
      console.warn('Supabase assessment read failed; falling back to Base44:', error);
    }
    return originalAssessmentList(...args);
  };
}

// Guest assessments are intentionally not exposed through the admin migration.
// Guest mode remains non-persistent from the admin data perspective.
if (client.entities?.GuestAssessment?.list) {
  client.entities.GuestAssessment.list = async () => [];
}

export const base44 = client;
