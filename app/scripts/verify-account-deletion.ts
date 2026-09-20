/** Read-only throwaway-account proof: zero snapshot rows AND absent auth user.
 * app/: npx tsx scripts/verify-account-deletion.ts
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DELETED_USER_ID.
 * Refresh metadata from repo root: python scripts/refresh_user_keyed_tables.py
 */
import fs from 'node:fs';
import process from 'node:process';
import { deletionVerificationTargets, verifyDeletedAccount } from './lib/accountDeletionVerification.ts';

async function main() {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../../docs/schema/user_keyed_tables.json', import.meta.url), 'utf8'));
  const targets = deletionVerificationTargets(snapshot);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.DELETED_USER_ID) {
    console.log('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DELETED_USER_ID for a throwaway account.');
    console.log('Required keys:', targets.filter((t) => !t.optional).map((t) => `${t.table}.${t.column}`).join(', '));
    process.exitCode = 2;
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await verifyDeletedAccount(admin, process.env.DELETED_USER_ID, targets);
  for (const key of result.checked) console.log(`${key}: 0`);
  for (const key of result.skipped) console.log(`${key}: optional table absent from snapshot and live DB`);
  console.log(`OK zero rows across ${result.checked.length} keys; auth user is gone`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Deletion verification failed');
  process.exitCode = 1;
});
