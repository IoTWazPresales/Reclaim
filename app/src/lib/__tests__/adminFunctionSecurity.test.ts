import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
const migration = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20260921091000_restrict_admin_function_execute.sql'), 'utf8');
const probe = fs.readFileSync(path.resolve(__dirname, '../../../../scripts/verify_admin_function_grants.sql'), 'utf8');
it('revokes PUBLIC and client grants while explicitly retaining service role', () => {
  const statements = migration.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
  expect(statements).toEqual([
    'begin', "set local lock_timeout = '5s'", "set local statement_timeout = '30s'",
    'revoke execute on function public.handle_new_user(), public.verify_training_user_integrity() from public, anon, authenticated',
    'grant execute on function public.handle_new_user(), public.verify_training_user_integrity() to service_role', 'commit',
  ]);
  for (const statement of statements.filter(s => /^(revoke|grant)/.test(s))) expect(probe).toContain(statement);
});
it('retains actual role-denial and signup assertions in a rollback-only probe', () => {
  expect(probe.replace(/--[^\n]*/g,'')).not.toMatch(/\bcommit\b/i);
  expect(probe).toContain('set local role authenticated');
  expect(probe).toContain('set local role anon');
  expect(probe).toContain('has_function_privilege');
  expect(probe).toContain("raise exception 'signup profile trigger failed'");
  expect(probe).toContain('exception when insufficient_privilege');
  expect(probe).toContain('rollback;');
});
