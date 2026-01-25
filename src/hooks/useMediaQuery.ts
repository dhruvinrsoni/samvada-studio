import { useState, useEffect } from 'react';

/**
 * Custom hook to track media query changes
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Create event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    // Fallback for older browsers
    else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [matches, query]);

  return matches;
}

/**
 * Responsive breakpoints following Tailwind CSS conventions
 */
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * Convenience hooks for common breakpoints
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(BREAKPOINTS.md);
}

export function useIsTablet(): boolean {
  const isMd = useMediaQuery(BREAKPOINTS.md);
  const isLg = useMediaQuery(BREAKPOINTS.lg);
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.lg);
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.xl);
}
