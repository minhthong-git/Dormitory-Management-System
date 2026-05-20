import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardStats } from '@/api/dashboard.api';

interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await dashboardApi.getStats();
        if (!cancelled) setStats(data.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            (err as { response?: { data?: { message?: string } } })
              ?.response?.data?.message ?? 'Không thể tải dữ liệu';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [tick]);

  return { stats, isLoading, error, refetch: () => setTick(t => t + 1) };
}
