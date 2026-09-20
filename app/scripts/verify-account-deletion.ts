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
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const TABLES_MODULE = path.resolve(__dirname, '../src/lib/personalDataTables.ts');

function readStringArray(source: string, exportName: string): string[] {
  const block = source.match(new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`));
  if (!block) {
    throw new Error(`Could not parse ${exportName} from personalDataTables.ts`);
  }
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function missingEnv(name: string): boolean {
  return !process.env[name];
}

async function main() {
  const source = fs.readFileSync(TABLES_MODULE, 'utf8');
  const userIdTables = [
    ...readStringArray(source, 'PERSONAL_DATA_USER_ID_DELETE_TABLES'),
    ...readStringArray(source, 'PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES'),
    ...readStringArray(source, 'PERSONAL_DATA_SERVICE_ROLE_EXTRA_TABLES'),
    ...readStringArray(source, 'PERSONAL_DATA_OPTIONAL_USER_ID_TABLES'),
  ];
  const idTables = readStringArray(source, 'PERSONAL_DATA_ID_KEYED_DELETE_TABLES');

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
