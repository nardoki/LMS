const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  console.log('Seeding demo certificate to remote Supabase via HTTPS REST API...');

  const { data, error } = await supabase
    .from('certificates')
    .upsert({
      student_id: '22222222-2222-2222-2222-222222222222',
      course_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      verification_code: 'MLMS-2026-ALICE-WEBDEV',
      mastered_concepts_json: ['HTML Elements & Semantics', 'CSS Box Model & Selectors'],
      payload_hash: '8f18c2807f62c5b967cecf2ad8a2cfec7535ad4687bc5e59b2d97adbafe5c635',
      issued_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'student_id,course_id' })
    .select();

  if (error) {
    console.error('Upsert error:', error);
    process.exit(1);
  }

  console.log('✅ Demo certificate seeded successfully! Row:', data);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
