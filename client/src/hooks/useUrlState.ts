import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

export type FilterState = Record<string, string | number | boolean | undefined>;

interface UseUrlStateOptions {
  defaults?: FilterState;
  prefix?: string;
}

export function useUrlState<T extends FilterState>(
  options: UseUrlStateOptions = {}
) {
  const { defaults = {}, prefix = "" } = options;
  const [location, setLocation] = useLocation();
  const searchString = useSearch();

  const parseSearchParams = useCallback((search: string): T => {
    const params = new URLSearchParams(search);
    const result: FilterState = { ...defaults };

    params.forEach((value, key) => {
      const stateKey = prefix ? key.replace(new RegExp(`^${prefix}_`), "") : key;
      
      if (value === "true") {
        result[stateKey] = true;
      } else if (value === "false") {
        result[stateKey] = false;
      } else if (!isNaN(Number(value)) && value !== "") {
        result[stateKey] = Number(value);
      } else {
        result[stateKey] = value;
      }
    });

    return result as T;
  }, [defaults, prefix]);

  const state = useMemo(() => {
    return parseSearchParams(searchString);
  }, [searchString, parseSearchParams]);

  const setState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const currentState = parseSearchParams(searchString);
    const newUpdates = typeof updates === "function" ? updates(currentState) : updates;
    const merged = { ...currentState, ...newUpdates };
    
    const params = new URLSearchParams();
    
    Object.entries(merged).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === false) {
        return;
      }
      if (typeof value === "number" && value === 0 && defaults[key] === 0) {
        return;
      }
      const paramKey = prefix ? `${prefix}_${key}` : key;
      params.set(paramKey, String(value));
    });

    const queryString = params.toString();
    const newUrl = queryString ? `${location.split("?")[0]}?${queryString}` : location.split("?")[0];
    
    setLocation(newUrl, { replace: false });
  }, [searchString, location, setLocation, prefix, defaults, parseSearchParams]);

  const resetState = useCallback(() => {
    const basePath = location.split("?")[0];
    // Use history.pushState for reliable param clearing, then trigger navigation
    window.history.pushState(null, "", basePath);
    // Force a re-render by setting location
    setLocation(basePath, { replace: true });
  }, [location, setLocation]);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(state).some(([key, value]) => {
      const defaultValue = defaults[key];
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "boolean" && value === false) return false;
      if (typeof value === "number" && value === 0 && defaultValue === 0) return false;
      if (value === defaultValue) return false;
      return true;
    });
  }, [state, defaults]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(state).filter(([key, value]) => {
      const defaultValue = defaults[key];
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "boolean" && value === false) return false;
      if (typeof value === "number" && value === 0 && defaultValue === 0) return false;
      if (value === defaultValue) return false;
      return true;
    }).length;
  }, [state, defaults]);

  return {
    state,
    setState,
    resetState,
    hasActiveFilters,
    activeFilterCount,
  };
}

export function useScrollPosition(key: string) {
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`scroll_${key}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      setTimeout(() => {
        window.scrollTo(0, position);
      }, 100);
    }

    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${key}`, String(window.scrollY));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [key]);
}

export function usePaginationState(pageKey: string = "page") {
  const { state, setState } = useUrlState<{ [key: string]: number }>({
    defaults: { [pageKey]: 1 },
  });

  const page = (state[pageKey] as number) || 1;

  const setPage = useCallback((newPage: number) => {
    setState({ [pageKey]: newPage });
  }, [setState, pageKey]);

  const nextPage = useCallback(() => {
    setState({ [pageKey]: page + 1 });
  }, [setState, pageKey, page]);

  const prevPage = useCallback(() => {
    setState({ [pageKey]: Math.max(1, page - 1) });
  }, [setState, pageKey, page]);

  return { page, setPage, nextPage, prevPage };
}
