import type { CareJournal } from '@workspace/api-client-react';

type ReadPage = (id: string, page: number, signal: AbortSignal) => Promise<CareJournal>;

/** Never return a partial history or mix live, edited and frozen versions. */
export async function readAllJournalPages(id: string, signal: AbortSignal, read: ReadPage) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal.throwIfAborted();
    const first = await read(id, 1, signal);
    if (!first.revision || first.page !== 1 || first.pageSize < 1 || first.total < 0) continue;
    const raw: unknown[] = [...first.entries];
    let page = first;
    let consistent = true;
    const pageCount = Math.max(1, Math.ceil(first.total / first.pageSize));
    for (let n = 2; page.hasMore && n <= pageCount; n += 1) {
      signal.throwIfAborted();
      page = await read(id, n, signal);
      if (page.total !== first.total || page.status !== first.status ||
          page.disconnectedAt !== first.disconnectedAt || page.lastUpdated !== first.lastUpdated ||
          page.revision !== first.revision || page.page !== n || page.pageSize !== first.pageSize) {
        consistent = false;
        break;
      }
      raw.push(...page.entries);
    }
    signal.throwIfAborted();
    if (consistent && !page.hasMore && raw.length === first.total) return { journal: first, raw };
  }
  throw new Error('journal_changed_while_reading');
}
