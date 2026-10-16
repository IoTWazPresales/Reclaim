const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from, auth: {getUser: mocks.getUser} } }));
vi.mock('@/lib/localData/database', () => ({initializeLocalDatabase: vi.fn(), requireLocalDatabase: vi.fn()}));
import { getFrozenProgramDayItems } from '@/lib/api';
function query(data: any[] | null, error: any = null) {
  const q: any = {then: (resolve: any) => Promise.resolve({data,error}).then(resolve)};
  for (const method of ['select','in','eq','order']) q[method] = vi.fn(() => q);
  mocks.from.mockReturnValue(q); return q;
}
beforeEach(() => {vi.clearAllMocks(); mocks.getUser.mockResolvedValue({data:{user:{id:'review-user'}},error:null});});
describe('R09 independent frozen snapshot API probes', () => {
  it('reads owned parent sessions and keeps latest frozen empty or guided snapshot per saved day', async () => {
    const guidedItems = [{id:'guided-item'}];
    const q = query([
      {id:'latest-empty',program_day_id:'day-a',started_at:'2026-10-15',training_session_items:[],decision_trace:{}},
      {id:'older-complete',program_day_id:'day-a',started_at:'2026-10-14',training_session_items:[{id:'old'}],decision_trace:{}},
      {id:'unstarted',program_day_id:'day-b',started_at:null,training_session_items:[{id:'discard'}],decision_trace:{notificationMode:'normal'}},
      {id:'guided',program_day_id:'day-b',started_at:null,training_session_items:guidedItems,decision_trace:{notificationMode:'guided'}},
    ]);
    expect(await getFrozenProgramDayItems(['day-a','day-b'])).toEqual({'day-a':[],'day-b':guidedItems});
    expect(mocks.from).toHaveBeenCalledWith('training_sessions');
    expect(q.eq).toHaveBeenCalledWith('user_id','review-user');
    expect(q.order.mock.calls).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]]);
    expect(q.in).toHaveBeenCalledWith('program_day_id',['day-a','day-b']);
  });
  it('propagates database failure instead of claiming absent frozen work', async () => {
    query(null,{message:'review offline'});
    await expect(getFrozenProgramDayItems(['day-a'])).rejects.toThrow('review offline');
  });
  it('skips query for empty saved-day list and requires authenticated ownership', async () => {
    expect(await getFrozenProgramDayItems([])).toEqual({});
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({data:{user:null},error:null});
    await expect(getFrozenProgramDayItems(['day-a'])).rejects.toThrow();
  });
});
