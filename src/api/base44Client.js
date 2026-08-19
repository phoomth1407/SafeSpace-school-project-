import { createClient } from '@staticbot/base44-supabase-shim';

export const base44 = createClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  schemaPrefix: 'public',
  entityMap: {"Assessment":{"schema":"public","table":"assessments"},"CommunityComment":{"schema":"public","table":"community_comments"},"CommunityPost":{"schema":"public","table":"community_posts"},"EmergencyResource":{"schema":"public","table":"emergency_resources"},"GuestAssessment":{"schema":"public","table":"guest_assessments"}},
});
