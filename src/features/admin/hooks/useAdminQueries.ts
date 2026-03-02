import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/client";
import { adminKeys } from "@/api/queryKeys";

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: dashboardApi.getAdminOverview,
  });
}
