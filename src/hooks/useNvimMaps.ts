import { useState, useEffect, useCallback } from "react";
import type { NvimMapping } from "../types/vim";
import { parseNvimMapOutput } from "../utils/nvim-map-parser";

interface UseNvimMapsResult {
  nvimMaps: NvimMapping[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNvimMaps(): UseNvimMapsResult {
  const [nvimMaps, setNvimMaps] = useState<NvimMapping[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nvim-maps");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      const maps = parseNvimMapOutput(data.raw);
      setNvimMaps(maps);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setNvimMaps(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  return { nvimMaps, loading, error, refresh: fetchMaps };
}
