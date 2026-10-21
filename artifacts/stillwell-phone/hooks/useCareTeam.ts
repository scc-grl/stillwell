import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyCareTeamQueryKey,
  useCancelPatientCareInvite,
  useCreatePatientCareInvite,
  useGetMyCareTeam,
  useRemoveCareClinician,
  useResendPatientCareInvite,
  useUndoCancelPatientCareInvite,
} from "@workspace/api-client-react";
import { usePatientData } from "@/contexts/PatientDataContext";
export { resendState } from "@/lib/care-team";

export function careTeamQueryKey(userId: string | null) {
  return [...getGetMyCareTeamQueryKey(), userId ?? "signed-out"] as const;
}

/** Mutations never queue offline: they always run immediately and never retry. */
const immediate = { networkMode: "always", retry: false } as const;

export function useCareTeam() {
  const queryClient = useQueryClient();
  const { userId, recovery } = usePatientData();
  const enabled = Boolean(userId && recovery?.profile);
  const queryKey = useMemo(() => careTeamQueryKey(userId), [userId]);

  const query = useGetMyCareTeam({
    query: { enabled, queryKey, retry: false },
  });

  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Refetch on account tab focus and on app foreground so acceptance shows up.
  useFocusEffect(
    useCallback(() => {
      if (enabledRef.current) void refetchRef.current();
      const interval = setInterval(() => {
        if (enabledRef.current && AppState.currentState === "active") void refetchRef.current();
      }, 60_000);
      return () => clearInterval(interval);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && enabledRef.current) void refetchRef.current();
    });
    return () => sub.remove();
  }, []);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const create = useCreatePatientCareInvite({ mutation: immediate });
  const resend = useResendPatientCareInvite({ mutation: immediate });
  const cancel = useCancelPatientCareInvite({ mutation: immediate });
  const undoCancel = useUndoCancelPatientCareInvite({ mutation: immediate });
  const remove = useRemoveCareClinician({ mutation: immediate });

  // Server clock offset so cooldowns don't depend on device time.
  const serverTime = query.data?.serverTime;
  const offset = useMemo(
    () => (serverTime ? new Date(serverTime).getTime() - query.dataUpdatedAt : 0),
    [serverTime, query.dataUpdatedAt],
  );
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => setTick(Date.now()), [query.dataUpdatedAt]);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = tick + offset;

  return {
    enabled,
    query,
    queryKey,
    refresh,
    now,
    create,
    resend,
    cancel,
    undoCancel,
    remove,
  };
}

