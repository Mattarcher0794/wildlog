import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { getMyProfile, type Profile } from "@/lib/profile.functions";

export function useMyProfile() {
  const fn = useServerFn(getMyProfile);
  return useQuery<Profile | null>({
    queryKey: ["my-profile"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

/**
 * First-time users land here with no username yet. Send them to the picker
 * before they can use the tabs. /username opts out via `skip`.
 */
export function useRequireUsername({ skip = false }: { skip?: boolean } = {}) {
  const { data, isLoading } = useMyProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (skip || isLoading) return;
    if ((!data || !data.username) && pathname !== "/username") {
      navigate({ to: "/username", replace: true });
    }
  }, [data, isLoading, pathname, navigate, skip]);

  return { profile: data, isLoading };
}
