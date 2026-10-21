import assert from 'node:assert/strict';
import test from 'node:test';
import { readAllJournalPages } from './journal-loader.ts';

const signal = () => new AbortController().signal;
function page(n, { total = 45, revision = 'v1', status = 'active' } = {}) {
  return { page: n, pageSize: 20, total, revision, status,
    disconnectedAt: status === 'former' ? '2026-10-21' : null,
    lastUpdated: '2026-10-20', hasMore: n * 20 < total,
    entries: Array.from({ length: Math.max(0, Math.min(20, total - (n - 1) * 20)) },
      (_, i) => ({ index: (n - 1) * 20 + i, revision })) };
}

test('loads all pages, including more than 500 pages, with no silent cap', async () => {
  const result = await readAllJournalPages('owned', signal(), async (_, n) => page(n, { total: 10001 }));
  assert.equal(result.raw.length, 10001);
  assert.equal(result.raw.at(-1).index, 10000);
});

test('a same-count, same-lastUpdated revision change restarts history at page one', async () => {
  const calls = [];
  let restart = false;
  const result = await readAllJournalPages('owned', signal(), async (_, n) => {
    calls.push(n);
    if (n === 2) restart = true;
    return page(n, { revision: restart ? 'v2' : 'v1' });
  });
  assert.deepEqual(calls, [1, 2, 1, 2, 3]);
  assert.equal(result.raw.length, 45);
  assert.ok(result.raw.every(entry => entry.revision === 'v2'));
});

test('disconnect during pagination returns only the restarted frozen snapshot', async () => {
  let former = false;
  const result = await readAllJournalPages('owned', signal(), async (_, n) => {
    if (n === 2) former = true;
    return page(n, { status: former ? 'former' : 'active', revision: former ? 'frozen' : 'live' });
  });
  assert.equal(result.journal.status, 'former');
  assert.ok(result.raw.every(entry => entry.revision === 'frozen'));
});

test('incomplete history fails after three attempts instead of returning partial success', async () => {
  let calls = 0;
  await assert.rejects(readAllJournalPages('owned', signal(), async (_, n) => {
    calls += 1;
    return { ...page(n), hasMore: false };
  }), /journal_changed_while_reading/);
  assert.equal(calls, 3);
});

test('continually changing history fails explicitly, and empty history succeeds', async () => {
  let call = 0;
  await assert.rejects(readAllJournalPages('owned', signal(), async (_, n) =>
    page(n, { revision: String(++call) })), /journal_changed_while_reading/);
  const empty = await readAllJournalPages('owned', signal(), async (_, n) => page(n, { total: 0 }));
  assert.deepEqual(empty.raw, []);
});

test('account-switch cancellation aborts the load before another page or cached result', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(readAllJournalPages('owned', controller.signal, async (_, n) => {
    calls += 1;
    controller.abort();
    return page(n);
  }), error => error.name === 'AbortError');
  assert.equal(calls, 1);
});
