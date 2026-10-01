import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const recipe = readFileSync(
  resolve(__dirname, '../../../Documentation/SUPABASE_MISSING_TABLES.sql'),
  'utf8',
);
const setup = readFileSync(
  resolve(__dirname, '../../../Documentation/SUPABASE_SETUP.sql'),
  'utf8',
);
const migration = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20261001160000_app_logs_owner_select.sql'),
  'utf8',
);

function selectPolicy(sql: string, table: string): string {
  const match = sql.match(
    new RegExp(
      `CREATE POLICY "Users can view their own logs"[\\s\\S]*?ON ${table} FOR SELECT[\\s\\S]*?;`,
      'i',
    ),
  );
  if (!match) throw new Error(`missing SELECT policy for ${table}`);
  return match[0];
}

describe('app_logs anonymous read', () => {
  it('keeps owner reads and anonymous inserts in the checked-in recipe', () => {
    expect(selectPolicy(recipe, 'app_logs')).not.toMatch(/auth\.uid\(\)\s+IS\s+NULL/i);
    expect(selectPolicy(recipe, 'app_logs')).toContain('USING (auth.uid() = user_id)');
    expect(recipe).toContain('WITH CHECK (user_id IS NULL)');
    expect(recipe).toContain('WITH CHECK (auth.uid() = user_id)');
  });

  it('closes the same SELECT hole on the logs setup recipe', () => {
    expect(selectPolicy(setup, 'logs')).not.toMatch(/auth\.uid\(\)\s+IS\s+NULL/i);
    expect(setup).toContain('WITH CHECK (auth.uid() = user_id OR user_id IS NULL)');
  });

  it('replaces only the unsafe live SELECT and leaves inserts alone', () => {
    expect(migration).toContain('drop policy if exists "Users can view their own logs"');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain('using (auth.uid() = user_id)');
    expect(migration).toContain('revoke select on table public.app_logs from anon');
    expect(migration.toLowerCase()).not.toContain('drop policy if exists "users can insert');
    expect(migration.toLowerCase()).not.toContain('delete from');
  });
});
