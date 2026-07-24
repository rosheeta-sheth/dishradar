const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users || users.users.length === 0) return console.log("No users found");
  
  const userId = users.users[0].id;
  const { data: prefs, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId);
  console.log("Prefs error:", error);
  console.log("Prefs for user:", prefs);
}
main();
