import {
  getGetAccountTypeQueryKey,
  getGetClinicianProfileQueryKey,
  useCompleteAccountRegistration,
  useCreateAccountRegistrationIntent,
  useGetAccountType,
  useGetClinicianProfile,
  useSaveClinicianProfile,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function useAccountType(enabled = true) {
  return useGetAccountType({
    query: { queryKey: getGetAccountTypeQueryKey(), enabled },
  });
}

export function useClinicianProfile(enabled = true) {
  return useGetClinicianProfile({
    query: { queryKey: getGetClinicianProfileQueryKey(), enabled },
  });
}

export function useRegistrationIntent() {
  return useCreateAccountRegistrationIntent();
}

export function useCompleteRegistration() {
  const queryClient = useQueryClient();
  return useCompleteAccountRegistration({
    mutation: {
      onSuccess: (accountType) => {
        window.sessionStorage.removeItem('stillwell.registrationToken');
        queryClient.setQueryData(getGetAccountTypeQueryKey(), accountType);
      },
    },
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useSaveClinicianProfile({
    mutation: {
      onSuccess: (profile) => {
        queryClient.setQueryData(getGetClinicianProfileQueryKey(), { profile });
        queryClient.invalidateQueries({
          queryKey: getGetAccountTypeQueryKey(),
        });
      },
    },
  });
}
