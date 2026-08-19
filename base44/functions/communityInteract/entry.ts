import { createClient as _createSupabase } from 'https://esm.sh/@supabase/supabase-js@2';
import { createClient as _createShim } from 'npm:@staticbot/base44-supabase-shim';

export default async function(req) {
  try {
    const _supabaseClient = _createSupabase(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );
    const base44 = _createShim({
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
      supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      schemaPrefix: 'public',
      entityMap: {"Assessment":{"schema":"public","table":"assessments"},"CommunityComment":{"schema":"public","table":"community_comments"},"CommunityPost":{"schema":"public","table":"community_posts"},"EmergencyResource":{"schema":"public","table":"emergency_resources"},"GuestAssessment":{"schema":"public","table":"guest_assessments"}},
      client: _supabaseClient,
    });
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { post_id, action } = body;
    if (!post_id || !action) {
      return Response.json({ error: 'ต้องส่ง post_id และ action' }, { status: 400 });
    }
    if (action !== 'heart' && action !== 'bump') {
      return Response.json({ error: 'action ต้องเป็น heart หรือ bump' }, { status: 400 });
    }

    const post = await base44.asServiceRole.entities.CommunityPost.get(post_id);
    if (!post) return Response.json({ error: 'ไม่พบโพสต์' }, { status: 404 });

    const listField = action === 'heart' ? 'hearted_by' : 'bumped_by';
    const countField = action === 'heart' ? 'hearts' : 'bumps';
    const arr = Array.isArray(post[listField]) ? [...post[listField]] : [];
    const idx = arr.indexOf(user.id);
    let active;
    if (idx >= 0) {
      arr.splice(idx, 1);
      active = false;
    } else {
      arr.push(user.id);
      active = true;
    }
    const newCount = Math.max(0, (post[countField] || 0) + (active ? 1 : -1));

    await base44.asServiceRole.entities.CommunityPost.update(post_id, {
      [listField]: arr,
      [countField]: newCount
    });

    return Response.json({
      hearts: action === 'heart' ? newCount : (post.hearts || 0),
      bumps: action === 'bump' ? newCount : (post.bumps || 0),
      hearted: action === 'heart' ? active : (Array.isArray(post.hearted_by) && post.hearted_by.includes(user.id)),
      bumped: action === 'bump' ? active : (Array.isArray(post.bumped_by) && post.bumped_by.includes(user.id))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
