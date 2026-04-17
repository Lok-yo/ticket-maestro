import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer .env.local manualmente
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function checkBoletos() {
  console.log('--- Buscando últimos 10 boletos ---');
  const { data, error } = await supabase
    .from('boleto')
    .select('id, estado, evento_id')
    .limit(10);

  if (error) {
    console.error('Error al leer boletos:', error);
  } else {
    console.table(data);
  }
}

checkBoletos();
