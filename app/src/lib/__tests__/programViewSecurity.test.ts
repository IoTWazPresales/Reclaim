import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20260921090000_program_views_security_invoker.sql'), 'utf8');
const probe = fs.readFileSync(path.resolve(__dirname, '../../../../scripts/verify_program_view_rls.sql'), 'utf8');
describe('program view security migration contract (live RLS proof is the SQL probe)', () => {
  it('changes only the two view options, atomically and with bounded locks', () => {
    const statements = migration.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
    expect(statements).toEqual([
      'begin', "set local lock_timeout = '5s'", "set local statement_timeout = '30s'",
      'alter view public.user_active_programs set (security_invoker = true)',
      'alter view public.program_progress set (security_invoker = true)', 'commit',
    ]);
  });
  it('keeps the two-user isolation fixture rollback-only with assertions under authenticated role', () => {
    const sql = probe.replace(/--[^\n]*/g, '');
    expect(sql).not.toMatch(/\bcommit\b/i);
    expect(sql).toContain('set local role authenticated');
    expect(sql).toContain('auth.uid() is distinct from subject');
    expect(sql).toContain("raise exception 'cross-user view leak'");
    expect(sql).toContain('own_count <> 1');
    expect(sql).toContain('completion_percentage=100');
    expect(sql).toContain('rollback;');
  });
});
