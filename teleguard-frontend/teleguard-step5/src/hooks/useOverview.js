import { useEffect, useState, useCallback } from "react";
import { getOverview } from "../api/client.js";
import { mockOverview } from "../data/mockData.js";

export function useOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOverview();
      setData(result);
      setIsMock(false);
    } catch {
      // Backend not reachable (e.g. not started yet during frontend dev) —
      // fall back to bundled sample data rather than showing a blank screen.
      setData(mockOverview);
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { overview: data, loading, isMock, refetch: load };
}
