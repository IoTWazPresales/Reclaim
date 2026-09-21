import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
const sql = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20260921092000_pin_function_search_paths.sql'), 'utf8');
const probe = fs.readFileSync(path.resolve(__dirname, '../../../../scripts/verify_function_search_paths.sql'), 'utf8');
it('pins only the four flagged functions with pg_temp explicitly last', () => {
  const names = ['set_updated_at','update_training_profiles_updated_at','verify_training_user_integrity','sleep_sessions_set_duration_minutes'];
  const statements = sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
  const alters = names.map(name => `alter function public.${name}() set search_path = pg_catalog, public, pg_temp`);
  expect(statements).toEqual(['begin', "set local lock_timeout = '5s'", "set local statement_timeout = '30s'", ...alters, 'commit']);
  for (const statement of alters) expect(probe).toContain(statement);
});
it('keeps trigger and hostile temp-shadow checks rollback-only', () => {
  expect(probe.replace(/--[^\n]*/g,'')).not.toMatch(/\bcommit\b/i);
  expect(probe).toContain('create temporary table training_sessions(shadow_only integer)');
  expect(probe).toContain('set local search_path = pg_temp, public');
  expect(probe).toContain('array[1,7,20]');
  expect(probe).toContain('from public.verify_training_user_integrity()');
  expect(probe).toContain('rollback;');
});
