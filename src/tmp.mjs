import { supabase } from './src/services/supabaseClient.js';
async function test() {
  const { data } = await supabase.from('accounting_cta_natalia').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
test();
