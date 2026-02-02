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

const { data } = await supabase
  .from('quotes')
  .select('quote_id, first_name, last_name, email, payload')
  .order('created_at', { ascending: false })
  .limit(3);

data?.forEach(q => {
  console.log('\n---', q.quote_id, '---');
  console.log('DB fields:', { first_name: q.first_name, last_name: q.last_name, email: q.email });
  console.log('Payload keys:', Object.keys(q.payload || {}));
  if (q.payload?.inputs) {
    console.log('Payload.inputs keys:', Object.keys(q.payload.inputs));
    console.log('Payload.inputs sample:', {
      firstName: q.payload.inputs.firstName,
      lastName: q.payload.inputs.lastName,
      email: q.payload.inputs.email
    });
  }
  console.log('Payload top-level:', { 
    firstName: q.payload?.firstName, 
    lastName: q.payload?.lastName, 
    email: q.payload?.email 
  });
});
