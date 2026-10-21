import { useMemo } from "react";
import {
  getPreviewCareRequestQueryKey,
  getReviewCareRequestQueryKey,
  usePreviewCareRequest,
  useRespondToCareRequest,
  useReviewCareRequest,
} from "@workspace/api-client-react";

/** Public, metadata-only preview. Scoped by viewer + token; never persisted. */
export function useCareRequestPreview(
  token: string | null,
  userId: string | null,
  enabled: boolean,
) {
  const queryKey = useMemo(
    () => [...getPreviewCareRequestQueryKey(token ?? ""), userId ?? "signed-out"],
    [token, userId],
  );
  const query = usePreviewCareRequest(token ?? "", {
    query: { queryKey, enabled: enabled && Boolean(token), retry: false, gcTime: 0 },
  });
  return { ...query, queryKey };
}

/** Authenticated review. Scoped by user + token; never persisted. */
export function useCareRequestReview(
  token: string | null,
  userId: string | null,
  enabled: boolean,
) {
  const queryKey = useMemo(
    () => [...getReviewCareRequestQueryKey(token ?? ""), userId ?? "signed-out"],
    [token, userId],
  );
  const query = useReviewCareRequest(token ?? "", {
    query: {
      queryKey,
      enabled: enabled && Boolean(token && userId),
      retry: false,
      gcTime: 0,
    },
  });
  return { ...query, queryKey };
}

export function useRespondToRequest() {
  return useRespondToCareRequest({
    mutation: { networkMode: "always", retry: false },
  });
}
