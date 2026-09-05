import { Keeping } from 'src/entity/keeping.entity';

export type SummaryRange = 'day' | 'week' | 'month' | 'all';

export interface CategorySlice {
  tag: string;
  amount: number;
  count: number;
}
export interface DaySlice {
  date: string;
  amount: number;
}
export interface LocationSlice {
  name: string;
  amount: number;
}
export interface KeepingSummary {
  range: SummaryRange;
  since: string | null;
  recordCount: number;
  income: number;
  expense: number;
  /** 支出按分类 tag 聚合（金额降序），对应客户端"消费分类"饼图 */
  byCategory: CategorySlice[];
  /** 支出按日聚合，对应客户端"消费时间"柱状图 */
  byDay: DaySlice[];
  /** 支出按地点聚合，对应客户端"消费地点"柱状图 */
  byLocation: LocationSlice[];
}

/** 各时间范围的起始时刻；all = 不限 */
export function rangeSince(range: SummaryRange, now = new Date()): Date | null {
  switch (range) {
    case 'day': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case 'month': {
      const d = new Date(now);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    case 'all':
      return null;
  }
}

/**
 * 纯函数聚合：把记账行汇总成统计视图。
 * 交易类型约定与客户端一致：transactionType === 1 为收入，其余为支出
 * （见 app 的 api/keeping.ts：transactionType === 1 ? 'in' : 'out'）。
 * 数据量是个人账单级别，拉行后内存聚合足够，不引入复杂 SQL GROUP BY
 */
export function summarizeKeepings(rows: Keeping[], range: SummaryRange, since: Date | null): KeepingSummary {
  const incomeRows: Keeping[] = [];
  const expenseRows: Keeping[] = [];
  for (const row of rows) {
    if (row.transactionType === 1) {
      incomeRows.push(row);
    } else {
      expenseRows.push(row);
    }
  }

  const sum = (list: Keeping[]) => list.reduce((acc, cur) => acc + Number(cur.amount ?? 0), 0);

  const tagMap = new Map<string, CategorySlice>();
  const dayMap = new Map<string, number>();
  const locationMap = new Map<string, number>();

  for (const row of expenseRows) {
    // tags 是逗号分隔别名串（"food,shop"）；空 tag 归入 other
    const tags = (row.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tag of tags.length ? tags : ['other']) {
      const slice = tagMap.get(tag) ?? { tag, amount: 0, count: 0 };
      slice.amount += Number(row.amount ?? 0);
      slice.count += 1;
      tagMap.set(tag, slice);
    }

    const day = new Date(row.createTime).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + Number(row.amount ?? 0));

    const location = row.position || '未知地点';
    locationMap.set(location, (locationMap.get(location) ?? 0) + Number(row.amount ?? 0));
  }

  const byAmountDesc = <T>(a: T, b: T, get: (x: T) => number) => get(b) - get(a);

  return {
    range,
    since: since ? since.toISOString() : null,
    recordCount: rows.length,
    income: sum(incomeRows),
    expense: sum(expenseRows),
    byCategory: [...tagMap.values()].sort((a, b) => byAmountDesc(a, b, (x) => x.amount)),
    byDay: [...dayMap.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byLocation: [...locationMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => byAmountDesc(a, b, (x) => x.amount)),
  };
}
