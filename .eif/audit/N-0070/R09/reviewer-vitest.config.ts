import base from 'C:/Reclaim/app/vitest.config';
export default {
  ...base,
  root: 'C:/Reclaim/.tmp/R09-verify/app',
  resolve: { ...base.resolve, alias: { ...base.resolve.alias, '@': 'C:/Reclaim/.tmp/R09-verify/app/src' } },
  test: { ...base.test, include: ['C:/Reclaim/.eif/audit/N-0070/R09/reviewer-*.test.ts'] },
};
