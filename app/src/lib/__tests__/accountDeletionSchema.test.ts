import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import snapshot from '../../../../docs/schema/user_keyed_tables.json';
import { PERSONAL_DATA_ID_KEYED_DELETE_TABLES, PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES } from '../personalDataTables';

const source = fs.readFileSync(path.resolve(__dirname, '../../../supabase/functions/delete-account/index.ts'), 'utf8');
function inventory(marker: string) {
  const block = source.slice(source.indexOf(marker)).match(/=\s*\[([\s\S]*?)\]\s*as const/);
  if (!block) throw new Error(`Inventory not found: ${marker}`);
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
const tables = inventory('const USER_ID_TABLES');
const idTables = inventory('const ID_KEYED_TABLES');
const deleteOrder = [...tables, ...idTables];

describe('delete-account live schema drift guard', () => {
  it('covers every snapshot user key using its actual column', () => {
    expect(snapshot.project_ref).toBe('bgtosdgrvjwlpqxqjvdf');
    expect(snapshot.tables.length).toBeGreaterThan(0);
    expect(new Set(snapshot.tables.map((t) => t.name)).size).toBe(snapshot.tables.length);
    for (const table of snapshot.tables) {
      for (const column of table.user_columns) {
        const covered = column === 'user_id' ? tables : column === 'id' ? idTables : [];
        expect(covered, `${table.name}.${column} is not deleted by the handler`).toContain(table.name);
      }
    }
    expect([...tables].sort()).toEqual([...PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES].sort());
    expect(idTables).toEqual([...PERSONAL_DATA_ID_KEYED_DELETE_TABLES]);
  });

  it('deletes restrictive auth FKs explicitly and public children before parents', () => {
    for (const table of snapshot.tables) {
      for (const fk of table.foreign_keys) {
        if (!['NO ACTION', 'RESTRICT'].includes(fk.delete_rule)) continue;
        const position = deleteOrder.indexOf(table.name);
        expect(position, `${table.name}: restrictive FK must be explicitly deleted`).toBeGreaterThanOrEqual(0);
        if (fk.referenced_schema === 'public' && deleteOrder.includes(fk.referenced_table)) {
          expect(position, `${table.name} must precede ${fk.referenced_table}`).toBeLessThan(deleteOrder.indexOf(fk.referenced_table));
        }
      }
    }
  });
});

// Execute the actual handler after TS erasure. Only SDK/network/env are fake.
const executable = ts.transpileModule(source.replace(/^import .*createClient.*;\r?\n/m, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
let handler: (req: Request) => Promise<Response>;
let calls: string[];
let failTable: string | null;
let resolveUser: ReturnType<typeof vi.fn>;
let authDelete: ReturnType<typeof vi.fn>;
const userId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  calls = [];
  failTable = null;
  resolveUser = vi.fn(async () => ({ data: { user: { id: userId } }, error: null }));
  authDelete = vi.fn(async (id: string) => {
    expect(id).toBe(userId);
    calls.push('auth.users');
    return { error: null };
  });
  const admin = {
    from: (table: string) => ({ delete: () => ({ eq: async (column: string, id: string) => {
      calls.push(table);
      expect(id).toBe(userId);
      expect(column).toBe(table === 'profiles' ? 'id' : 'user_id');
      return { error: table === failTable ? { message: 'database unavailable' } : null };
    } }) }),
    auth: { admin: { deleteUser: authDelete } },
  };
  const createClient = vi.fn((_url: string, key: string) => key === 'service' ? admin : { auth: { getUser: resolveUser } });
  const deno = {
    env: { get: (key: string) => ({ SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[key] },
    serve: (fn: typeof handler) => { handler = fn; },
  };
  new Function('Deno', 'createClient', executable)(deno, createClient);
});

const request = () => new Request('https://test.invalid/delete-account', {
  method: 'POST', headers: { Authorization: 'Bearer throwaway-test-token' },
  body: JSON.stringify({ userId: 'untrusted-body-user' }),
});

describe('actual delete-account handler sequencing', () => {
  it('deletes every table for the authenticated user before deleting auth', async () => {
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(calls).toEqual([...deleteOrder, 'auth.users']);
    expect(authDelete).toHaveBeenCalledTimes(1);
    expect(await response.json()).toMatchObject({ ok: true, userId });
  });
  it.each(['routine_suggestions', 'routine_templates', 'profiles'])('never deletes auth after %s fails', async (table) => {
    failTable = table;
    const response = await handler(request());
    expect(response.status).toBe(500);
    expect(authDelete).not.toHaveBeenCalled();
    expect(calls.at(-1)).toBe(table);
  });
  it('rejects an invalid session without any admin deletes', async () => {
    resolveUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });
    expect((await handler(request())).status).toBe(401);
    expect(calls).toEqual([]);
  });
  it('reports auth deletion failure without claiming success', async () => {
    authDelete.mockResolvedValue({ error: { message: 'auth unavailable' } });
    const response = await handler(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: 'auth_delete_failed' });
  });
});
