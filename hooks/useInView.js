"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver hook. Returns:
 *   - ref: attach to the element you want to observe
 *   - isInView: boolean — true once the element has entered viewport
 *     (stays true after first intersection by default; pass { once: false }
 *     to toggle continuously as the user scrolls)
 *   - entry: raw IntersectionObserverEntry for advanced usage
 *
 * No external dependencies; uses native IntersectionObserver with a
 * sensible rootMargin so lazy content loads ~200px before it arrives.
 *
 * Usage:
 *   const { ref, isInView } = useInView({ once: true });
 *   return <div ref={ref}>{isInView ? <ExpensiveContent /> : <Skeleton />}</div>;
 */
export function useInView({
  once = true,
  rootMargin = "200px",
  threshold = 0,
} = {}) {
  const ref = useRef(null);
  const [state, setState] = useState({
    isInView: false,
    entry: null,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setState({ isInView: true, entry: null });
      return;
    }

    let isActive = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!isActive) return;
        const entry = entries[0];
        const inViewNow = entry.isIntersecting;
        setState((prev) => {
          if (once && prev.isInView) return prev;
          return { isInView: inViewNow, entry };
        });
        if (once && inViewNow) {
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => {
      isActive = false;
      observer.disconnect();
    };
  }, [once, rootMargin, threshold]);

  return {
    ref,
    isInView: state.isInView,
    entry: state.entry,
  };
}

export default useInView;
