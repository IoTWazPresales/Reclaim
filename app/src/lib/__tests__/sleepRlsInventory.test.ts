import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const policySql = fs.readFileSync(path.resolve(__dirname, '../../../../docs/schema/sleep_sessions_policies_observed.sql'), 'utf8');
it('records the two actual owner-only sleep policies, including write checks', () => {
  expect(policySql).toContain('enable row level security');
  expect(policySql).toMatch(/create policy sleep_sessions_rw[\s\S]*using \(auth.uid\(\) = user_id\) with check \(auth.uid\(\) = user_id\)/);
  expect(policySql).toMatch(/create policy sleeps_owner_rw[\s\S]*using \(user_id = auth.uid\(\)\) with check \(user_id = auth.uid\(\)\)/);
  expect(policySql).not.toMatch(/using\s*\([^;]*\bor\b[^;]*auth\.uid\(\)\s+is\s+null/i);
});

it('labels observed policy SQL as a reference, not a newly applied migration', () => {
  expect(policySql).toContain('REFERENCE ONLY');
  expect(policySql).toContain('not applied by this assessment');
});
