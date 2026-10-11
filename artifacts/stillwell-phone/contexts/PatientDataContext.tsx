import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/expo";
import {
  getGetAccountTypeQueryKey,
  getGetRecoveryQueryKey,
  useGetAccountType,
  useGetRecovery,
  type AccountTypeResponse,
  type RecoveryState,
} from "@workspace/api-client-react";

type PatientDataContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  accountType: AccountTypeResponse["accountType"] | null;
  accountTypeLoading: boolean;
  accountTypeError: boolean;
  refreshAccountType: () => void;
  recovery: RecoveryState | undefined;
  recoveryLoading: boolean;
  recoveryError: boolean;
  refreshRecovery: () => void;
};

const PatientDataContext = createContext<PatientDataContextValue | null>(null);

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const signedIn = Boolean(isLoaded && isSignedIn && userId);
  const accountTypeKey = useMemo(
    () => [...getGetAccountTypeQueryKey(), userId ?? "signed-out"],
    [userId],
  );
  const recoveryKey = useMemo(
    () => [...getGetRecoveryQueryKey(), userId ?? "signed-out"],
    [userId],
  );
  const accountTypeQuery = useGetAccountType({
    query: {
      enabled: signedIn,
      queryKey: accountTypeKey,
      retry: false,
    },
  });
  const accountType = signedIn
    ? (accountTypeQuery.data?.accountType ?? null)
    : null;
  const isPatient = signedIn && accountType === "patient";
  const recoveryQuery = useGetRecovery({
    query: {
      enabled: isPatient,
      queryKey: recoveryKey,
      retry: false,
    },
  });

  const value = useMemo<PatientDataContextValue>(
    () => ({
      isLoaded,
      isSignedIn: signedIn,
      userId: userId ?? null,
      accountType,
      accountTypeLoading: signedIn && accountTypeQuery.isLoading,
      accountTypeError: signedIn && accountTypeQuery.isError,
      refreshAccountType: () => {
        void accountTypeQuery.refetch();
      },
      recovery: isPatient ? recoveryQuery.data : undefined,
      recoveryLoading: isPatient && recoveryQuery.isLoading,
      recoveryError: isPatient && recoveryQuery.isError,
      refreshRecovery: () => {
        void recoveryQuery.refetch();
      },
    }),
    [
      isLoaded,
      signedIn,
      userId,
      accountType,
      accountTypeQuery.isLoading,
      accountTypeQuery.isError,
      accountTypeQuery.refetch,
      isPatient,
      recoveryQuery.data,
      recoveryQuery.isLoading,
      recoveryQuery.isError,
      recoveryQuery.refetch,
    ],
  );

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  );
}

export function usePatientData() {
  const value = useContext(PatientDataContext);
  if (!value) {
    throw new Error("PatientDataProvider is required.");
  }
  return value;
}
