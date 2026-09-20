import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PERSONAL_DATA_ID_KEYED_DELETE_TABLES,
  PERSONAL_DATA_OPTIONAL_USER_ID_TABLES,
  PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES,
} from '../../src/lib/personalDataTables.ts';

export type UserKeySnapshot = { tables: Array<{ name: string; user_columns: string[] }> };
export type VerificationTarget = { table: string; column: string; optional: boolean };

export function deletionVerificationTargets(snapshot: UserKeySnapshot): VerificationTarget[] {
  if (!snapshot.tables.length) throw new Error('Empty user-key snapshot');
  const targets = new Map<string, VerificationTarget>();
  const add = (table: string, column: string, optional: boolean) => {
    const key = `${table}.${column}`;
    targets.set(key, { table, column, optional: optional && (targets.get(key)?.optional ?? true) });
  };
  for (const table of snapshot.tables) {
    if (!table.user_columns.length) throw new Error(`Missing user key: ${table.name}`);
    for (const column of table.user_columns) add(table.name, column, false);
  }
  for (const table of PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES) {
    add(table, 'user_id', (PERSONAL_DATA_OPTIONAL_USER_ID_TABLES as readonly string[]).includes(table));
  }
  for (const table of PERSONAL_DATA_ID_KEYED_DELETE_TABLES) add(table, 'id', false);
  return [...targets.values()].sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

/** Read-only proof for an explicitly selected throwaway user. */
export async function verifyDeletedAccount(
  admin: SupabaseClient, userId: string, targets: VerificationTarget[],
): Promise<{ checked: string[]; skipped: string[] }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('DELETED_USER_ID must be the throwaway account UUID');
  }
  if (!targets.length) throw new Error('No tables to verify');
  const checked: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];
  for (const { table, column, optional } of targets) {
    const key = `${table}.${column}`;
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, userId);
    if (error) {
      if (optional && (error.code === '42P01' || error.code === 'PGRST205')) skipped.push(key);
      else failures.push(`${key}: query failed (${error.code ?? 'unknown'})`);
    } else if (count !== 0) {
      failures.push(`${key}: ${count == null ? 'unknown row count' : `${count} rows remain`}`);
    } else checked.push(key);
  }
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (data?.user || !error || error.status !== 404 || error.code !== 'user_not_found') {
    failures.push(`auth.users: ${data?.user ? 'user still exists' : 'absence not proven'}`);
  }
  if (failures.length) throw new Error(`Deletion not verified:\n${failures.join('\n')}`);
  return { checked, skipped };
}
