import { useEffect, useState } from 'react';

export interface ThemeColors {
  ink: string;
  muted: string;
  gold: string;
  rose: string;
  success: string;
  danger: string;
  border: string;
  panel: string;
}

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => `rgb(${cs.getPropertyValue(`--${n}`).trim().split(/\s+/).join(',')})`;
  return {
    ink: v('ink'),
    muted: v('muted'),
    gold: v('gold'),
    rose: v('rose'),
    success: v('success'),
    danger: v('danger'),
    panel: v('panel'),
    border: cs.getPropertyValue('--border').trim(),
  };
}

/** Current theme colours for canvas-based charts; updates when the theme changes. */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}
