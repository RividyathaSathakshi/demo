import type { SVGProps } from 'react';

const PATHS = {
  check: 'M5 12.5l4.2 4.2L19 7',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.3l2.8 2.8L16.3 9.4',
  triangle: 'M12 3.8L21.2 19.5H2.8L12 3.8zM12 10v4M12 17v.01',
  octagon: 'M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2L8.2 3zM12 7.5v5.5M12 16.5v.01',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.6M12 17v.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.01',
  camera: 'M4 8h3l1.8-2.5h6.4L17 8h3v11H4V8zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  image: 'M4 5h16v14H4V5zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18M15.5 9.5v.01',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  monitor: 'M3.5 5h17v11h-17V5zM9 20h6M12 16v4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronDown: 'M6 9.5l6 6 6-6',
  calendar: 'M4.5 6h15v14h-15V6zM4.5 10.5h15M8.5 3.5V8M15.5 3.5V8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  grid: 'M4 4h7v7H4V4zM13 4h7v4h-7V4zM13 10h7v10h-7V10zM4 13h7v7H4v-7z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.3 1.3l-.3 2h-4l-.3-2a7 7 0 0 1-2.3-1.3l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7 7 0 0 1 2.3-1.3l.3-2h4l.3 2a7 7 0 0 1 2.3 1.3l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 12.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3zM9 12l2.2 2.2L15.5 10',
  lock: 'M6 11h12v9.5H6V11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  drop: 'M12 3.2c3.3 4 5.8 7.4 5.8 10.5a5.8 5.8 0 1 1-11.6 0C6.2 10.6 8.7 7.2 12 3.2z',
  bloom: 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 7.5c0-2.5 1.3-4 3-4s2.5 2 1.5 3.6M14.4 9.6c2.2-1 4.2-.6 4.8 1s-.9 3-2.7 3M14 12.4c1.5 2 1.5 4 0 4.9s-3.1-.4-3.4-2.2M10 12.3c-1.7 1.8-3.7 2.2-4.6.9s.2-3.2 2-3.6M9.6 9.4C7.3 8.7 6.2 7 7 5.6s2.9-1.1 4 .4M12 13v7.5',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5',
  rotate: 'M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15M4.5 19.5V15H9',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10',
  plus: 'M12 5v14M5 12h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  layers: 'M12 3.5l8.5 4.5-8.5 4.5L3.5 8 12 3.5zM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5',
  swap: 'M7 7h12l-3-3M17 17H5l3 3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
  phone: 'M7.5 3h9v18h-9V3zM11 18h2',
  mail: 'M3.5 6h17v12h-17V6zM3.8 6.4L12 12.5l8.2-6.1',
  hand: 'M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5M14 11.5V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.2 7-2.6 0-4.1-1.3-5.4-3.3L4 14.5a1.6 1.6 0 0 1 2.6-1.8L8 14.5',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** When set, the icon is announced; otherwise it is decorative. */
  label?: string;
}

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
