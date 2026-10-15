import base from 'C:/Reclaim-R08-verify-20261015/app/vitest.config';

export default {
  ...base,
  root: 'C:/Reclaim-R08-verify-20261015/app',
  test: {
    ...base.test,
    include: ['C:/Reclaim/.eif/audit/N-0070/R08/reviewer-probes.test.ts'],
  },
};
