import { useUser } from '@clerk/react';
import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  getCarePatientJournal,
  getGetCarePatientJournalQueryKey,
  getGetMyCarePatientsQueryKey,
  getGetMyCareRequestsQueryKey,
  useGetMyCarePatients,
  useGetMyCareRequests,
  type CareJournal,
  type GetMyCarePatients200,
  type GetMyCareRequests200,
} from '@workspace/api-client-react';
import { normalizeCareEntries, type ClinicalEntry } from '@workspace/recovery-journal/clinician-journal';

/**
 * Private clinical reads: never cached after unmount, never retried or queued
 * offline, refreshed on mount/focus and polled so a patient who stops sharing
 * is noticed (the API then returns the same link id as a former snapshot).
 */
export const careQueryOptions = {
  gcTime: 0,
  retry: false,
  networkMode: 'always',
  staleTime: 30_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchInterval: 60_000,
} as const;

export const careMutationOptions = { networkMode: 'always', retry: false } as const;

export function useCareOwner(): string | null {
  const { isLoaded, user } = useUser();
  return isLoaded && user?.id ? user.id : null;
}

export function carePatientsKey(owner: string | null) {
  return [...getGetMyCarePatientsQueryKey(), owner ?? 'signed-out'] as const;
}

export function useCarePatients(enabled = true): UseQueryResult<GetMyCarePatients200 | undefined, unknown> {
  const owner = useCareOwner();
  return useGetMyCarePatients({
    query: { queryKey: carePatientsKey(owner), enabled: enabled && Boolean(owner), ...careQueryOptions },
  });
}

export function useCareRequests(enabled = true): UseQueryResult<GetMyCareRequests200 | undefined, unknown> {
  const owner = useCareOwner();
  return useGetMyCareRequests({
    query: {
      queryKey: [...getGetMyCareRequestsQueryKey(), owner ?? 'signed-out'],
      enabled: enabled && Boolean(owner),
      ...careQueryOptions,
    },
  });
}

export interface FullJournal {
  journal: CareJournal;
  entries: ClinicalEntry[];
}

/** Reads every page so ranges and stats cover the whole selected history, not just page one. */
async function fetchAllPages(id: string, signal: AbortSignal): Promise<FullJournal> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const first = await getCarePatientJournal(id, { page: 1 }, { signal });
    const raw: unknown[] = [...first.entries];
    let page = first;
    let consistent = true;
    const pageCount = Math.max(1, Math.ceil(first.total / first.pageSize));
    for (let n = 2; page.hasMore && n <= pageCount; n += 1) {
      page = await getCarePatientJournal(id, { page: n }, { signal });
      // An edit, or the patient stopping sharing (live -> frozen snapshot),
      // mid-read: restart from page one so pages never mix two versions.
      if (page.total !== first.total || page.status !== first.status ||
          page.disconnectedAt !== first.disconnectedAt || page.lastUpdated !== first.lastUpdated) {
        consistent = false;
        break;
      }
      raw.push(...page.entries);
    }
    if (consistent && !page.hasMore) return { journal: first, entries: normalizeCareEntries(raw) };
  }
  throw new Error('journal_changed_while_reading');
}

const MAX_ATTEMPTS = 3;

export function useFullJournal(id: string, enabled = true) {
  const owner = useCareOwner();
  return useQuery({
    queryKey: [...getGetCarePatientJournalQueryKey(id), 'all', owner ?? 'signed-out'],
    queryFn: ({ signal }) => fetchAllPages(id, signal),
    enabled: enabled && Boolean(owner) && Boolean(id),
    ...careQueryOptions,
  });
}

const isCareKey = (key: readonly unknown[]) =>
  typeof key[0] === 'string' && key[0].startsWith('/api/clinician/care-team/');

/** Refresh every care list and journal detail after any care mutation. */
export function invalidateCare(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ predicate: (query) => isCareKey(query.queryKey) });
}

/** Drop every cached care read (used on sign-out). */
export function removeCare(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => isCareKey(query.queryKey) });
}

export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
