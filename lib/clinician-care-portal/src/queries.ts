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
import { readAllJournalPages } from './journal-loader';

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
  const { journal, raw } = await readAllJournalPages(id, signal,
    (link, page, abort) => getCarePatientJournal(link, { page }, { signal: abort }));
  return { journal, entries: normalizeCareEntries(raw) };
}

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
