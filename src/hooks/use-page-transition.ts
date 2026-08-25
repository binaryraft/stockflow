'use client';

import { useEffect, useState } from 'react';

const TRANSITION_PLAYED_KEY = 'sf-page-transition-played';

/**
 * Returns true only on the first landing of the browser session,
 * so the page fade-in animation does not replay on refresh or navigation.
 */
export function usePageTransition(): boolean {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(TRANSITION_PLAYED_KEY)) {
        sessionStorage.setItem(TRANSITION_PLAYED_KEY, '1');
        setPlay(true);
      }
    } catch {
      // sessionStorage unavailable (e.g. privacy mode) — skip the animation
    }
  }, []);

  return play;
}
