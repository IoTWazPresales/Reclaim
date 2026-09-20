import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PERSONAL_DATA_ID_KEYED_DELETE_TABLES,
  PERSONAL_DATA_OPTIONAL_USER_ID_TABLES,
  PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES,
  PERSONAL_DATA_SERVICE_ROLE_EXTRA_TABLES,
  PERSONAL_DATA_SERVICE_ROLE_PRIORITY_TABLES,
  PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES,
  PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES,
  PERSONAL_DATA_USER_ID_DELETE_TABLES,
} from '@/lib/personalDataTables';

const EDGE_FN = path.resolve(__dirname, '../../../supabase/functions/delete-account/index.ts');
const VERIFY_SCRIPT = path.resolve(__dirname, '../../../scripts/verify-account-deletion.ts');
const VERIFY_HELPER = path.resolve(__dirname, '../../../scripts/lib/accountDeletionVerification.ts');
const CLIENT_PRIVACY = path.resolve(__dirname, '../dataPrivacy.ts');

function parseQuotedStringsInArray(source: string, marker: string): string[] {
  const idx = source.indexOf(marker);
  expect(idx, `missing ${marker}`).toBeGreaterThanOrEqual(0);
  const slice = source.slice(idx);
  const block = slice.match(/=\s*\[([\s\S]*?)\]\s*as const/);
  expect(block, `array after ${marker}`).toBeTruthy();
  return [...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('account-delete cloud table coverage (N-0014 / N-0037)', () => {
  it('deletes mood_checkins and training sessions; items cascade from sessions', () => {
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('mood_checkins');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_sessions');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_program_instances');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_profiles');
    expect(PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES).toContain('training_session_items');
    expect(PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES).toContain('training_set_logs');
  });

  it('records training_events as client-undeletable under repo RLS', () => {
    expect(PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES).toContain('training_events');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).not.toContain('training_events');
  });

  it('deletes sessions before program instances and profiles', () => {
    const tables = [...PERSONAL_DATA_USER_ID_DELETE_TABLES];
    expect(tables.indexOf('training_sessions')).toBeLessThan(tables.indexOf('training_program_instances'));
    expect(tables.indexOf('training_program_days')).toBeLessThan(tables.indexOf('training_program_instances'));
    expect(tables.indexOf('training_program_instances')).toBeLessThan(tables.indexOf('training_profiles'));
  });

  it('service-role inventory covers RLS-blocked, run tables, and profiles', () => {
    expect(PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES).toContain('training_events');
    expect(PERSONAL_DATA_SERVICE_ROLE_EXTRA_TABLES).toEqual(
      expect.arrayContaining(['logs', 'app_logs', 'sleep_prefs', 'activity_daily']),
    );
    expect(PERSONAL_DATA_OPTIONAL_USER_ID_TABLES).toEqual(expect.arrayContaining(['run_sessions', 'run_routes']));
    expect(PERSONAL_DATA_ID_KEYED_DELETE_TABLES).toContain('profiles');
  });

  it('delete-account Edge Function table list matches the canonical inventory', () => {
    const source = fs.readFileSync(EDGE_FN, 'utf8');
    const fnUserId = parseQuotedStringsInArray(source, 'const USER_ID_TABLES');
    const fnIdKeyed = parseQuotedStringsInArray(source, 'const ID_KEYED_TABLES');
    expect(fnUserId.sort()).toEqual([...PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES].sort());
    expect(fnIdKeyed.sort()).toEqual([...PERSONAL_DATA_ID_KEYED_DELETE_TABLES].sort());
    expect(source).toContain('auth.admin.deleteUser');
  });

  it('deletes the deployed priority group first with suggestions before templates', () => {
    const priority = [
      'routine_suggestions', 'routine_templates', 'insight_feedback',
      'medication_logs', 'medication_schedules',
    ];
    const source = fs.readFileSync(EDGE_FN, 'utf8');
    const tables = parseQuotedStringsInArray(source, 'const USER_ID_TABLES');
    expect(PERSONAL_DATA_SERVICE_ROLE_PRIORITY_TABLES).toEqual(priority);
    expect(tables.slice(0, priority.length)).toEqual(priority);
    expect(PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES.slice(0, priority.length)).toEqual(priority);
    for (const table of priority) {
      expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).not.toContain(table);
    }
    expect(new Set(tables).size).toBe(tables.length);
    expect(source.indexOf('for (const table of USER_ID_TABLES)')).toBeLessThan(
      source.indexOf('auth.admin.deleteUser'),
    );
  });

  it('client fallback never attempts RLS-blocked tables', () => {
    const source = fs.readFileSync(CLIENT_PRIVACY, 'utf8');
    expect(source).not.toMatch(/for \(const table of PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES\)/);
    expect(source).not.toMatch(/import\s*\{[^}]*PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES[^}]*\}\s*from/);
    expect(source).toContain("functions.invoke('delete-account'");
  });

  it('verify script reads the canonical table module', () => {
    const source = fs.readFileSync(VERIFY_SCRIPT, 'utf8');
    const helper = fs.readFileSync(VERIFY_HELPER, 'utf8');
    expect(helper).toContain('personalDataTables.ts');
    expect(helper).toContain('PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES');
    expect(source).toContain('user_keyed_tables.json');
    expect(source).toContain('DELETED_USER_ID');
    expect(helper).toContain('getUserById');
  });
});
