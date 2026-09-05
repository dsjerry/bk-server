import { Keeping } from 'src/entity/keeping.entity';
import { rangeSince, summarizeKeepings } from './summary.helper';

/** 构造一条记账测试数据；transactionType 1=收入 2=支出（与客户端约定一致） */
function rowOf(overrides: Partial<Keeping>): Keeping {
  return {
    id: 1,
    createUserId: 1,
    name: '记录',
    transactionType: 2,
    category: null,
    amount: 10,
    position: null,
    image: null,
    remark: null,
    localId: null,
    currency: null,
    tags: null,
    longitude: null,
    latitude: null,
    createTime: new Date('2026-06-15T10:00:00Z'),
    updateTime: new Date('2026-06-15T10:00:00Z'),
    deleteAt: null,
    analysis: [],
    ...overrides,
  } as Keeping;
}

describe('summary.helper', () => {
  it('rangeSince: month 返回本月 1 号，all 返回 null', () => {
    const now = new Date('2026-06-15T10:00:00Z');
    expect(rangeSince('month', now)?.getMonth()).toBe(5);
    expect(rangeSince('month', now)?.getDate()).toBe(1);
    expect(rangeSince('all', now)).toBeNull();
  });

  it('按客户端约定拆分收支（transactionType 1=收入）并聚合分类', () => {
    const rows: Keeping[] = [
      rowOf({ id: 1, transactionType: 2, amount: 30, tags: 'food,shop', position: '超市' }),
      rowOf({ id: 2, transactionType: 2, amount: 20, tags: 'food', position: '超市' }),
      rowOf({ id: 3, transactionType: 2, amount: 50, tags: '', position: '加油站' }),
      rowOf({ id: 4, transactionType: 1, amount: 5000, tags: 'salary' }),
    ];

    const summary = summarizeKeepings(rows, 'month', null);

    expect(summary.income).toBe(5000);
    expect(summary.expense).toBe(100);
    expect(summary.byCategory).toHaveLength(3); // food / shop / other
    // 多 tag 记录（"food,shop"）同时计入两个分类；无 tag 的支出归入 other
    expect(summary.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'food', amount: 50, count: 2 }),
        expect.objectContaining({ tag: 'shop', amount: 30, count: 1 }),
        expect.objectContaining({ tag: 'other', amount: 50, count: 1 }),
      ]),
    );
    // 同地点支出合并
    expect(summary.byLocation).toEqual([
      expect.objectContaining({ name: '超市', amount: 50 }),
      expect.objectContaining({ name: '加油站', amount: 50 }),
    ]);
    expect(summary.byDay.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))).toBe(true);
  });
});
