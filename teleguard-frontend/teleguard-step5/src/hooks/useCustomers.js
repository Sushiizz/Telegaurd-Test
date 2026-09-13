import { useEffect, useState, useCallback } from "react";
import { getCustomers } from "../api/client.js";
import { paginateMock } from "../data/mockData.js";

const DEFAULT_FILTERS = {
  riskLevel: undefined,
  contractType: undefined,
  search: "",
  sortBy: "retention_opportunity_score",
  sortDir: "desc",
  page: 1,
  pageSize: 25,
};

export function useCustomers(initialFilters = {}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });
  const [result, setResult] = useState({ items: [], page: 1, page_size: 25, total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const load = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      const data = await getCustomers(currentFilters);
      setResult(data);
      setIsMock(false);
    } catch {
      setResult(paginateMock(currentFilters));
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.riskLevel,
    filters.contractType,
    filters.search,
    filters.sortBy,
    filters.sortDir,
    filters.page,
    filters.pageSize,
  ]);

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      // Any filter/sort change other than page itself resets pagination —
      // staying on page 6 of a now-tiny filtered result is a dead end.
      page: "page" in patch ? patch.page : 1,
    }));
  }, []);

  const toggleSort = useCallback((field) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortDir: prev.sortBy === field && prev.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  return { result, filters, loading, isMock, updateFilters, toggleSort, clearFilters };
}
