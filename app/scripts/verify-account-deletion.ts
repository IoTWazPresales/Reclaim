/**
 * Verify a deleted test user has zero rows in every user-keyed table (N-0037).
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DELETED_USER_ID
 *
 * Usage (from app/):
 *   npx tsx scripts/verify-account-deletion.ts
 *
 * Exit 0 = all counts zero (or table missing). Exit 1 = leftover rows.
 */
import process from 'node:process';
import {
  PERSONAL_DATA_ID_KEYED_DELETE_TABLES,
  PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES,
} from '../src/lib/personalDataTables.ts';

function missingEnv(name: string): boolean {
  return !process.env[name];
}

async function main() {
  const userIdTables = PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES;
  const idTables = PERSONAL_DATA_ID_KEYED_DELETE_TABLES;

  if (missingEnv('SUPABASE_URL') || missingEnv('SUPABASE_SERVICE_ROLE_KEY') || missingEnv('DELETED_USER_ID')) {
    console.log('N-0037 verify-account-deletion: env not set. Tables that must be empty:');
    for (const table of userIdTables) console.log(`  ${table}.user_id`);
    for (const table of idTables) console.log(`  ${table}.id`);
    console.log('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DELETED_USER_ID and re-run.');
    process.exit(2);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = process.env.DELETED_USER_ID!;
  const leftovers: string[] = [];

  for (const table of userIdTables) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('42p01')) {
        console.log(`skip missing table ${table}`);
        continue;
      }
      throw error;
    }
    console.log(`${table}: ${count ?? 0}`);
    if ((count ?? 0) > 0) leftovers.push(`${table}:${count}`);
  }

  for (const table of idTables) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('id', userId);
    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('42p01')) {
        console.log(`skip missing table ${table}`);
        continue;
      }
      throw error;
    }
    console.log(`${table}: ${count ?? 0}`);
    if ((count ?? 0) > 0) leftovers.push(`${table}:${count}`);
  }

  if (leftovers.length) {
    console.error('LEFTOVER_ROWS', leftovers.join(', '));
    process.exit(1);
  }
  console.log(`OK zero rows for ${userId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
