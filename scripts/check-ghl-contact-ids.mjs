import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('quotes')
  .select('quote_id, first_name, email, ghl_contact_id')
  .is('first_name', null)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${data?.length || 0} quotes with null first_name:\n`);
data?.forEach(q => {
  console.log(`${q.quote_id}: ghl_contact_id = ${q.ghl_contact_id || '(null)'}`);
});

const withGHL = data?.filter(q => q.ghl_contact_id).length || 0;
console.log(`\n${withGHL} of ${data?.length || 0} have GHL contact IDs`);
