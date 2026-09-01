/* The interface icons, kept together so the chrome has one source of truth.
   Every one is stroked with currentColor and sized by its caller. */

type P = { size?: number; className?: string };
const box = (s = 15) => ({ width: s, height: s, viewBox: "0 0 16 16", fill: "none" as const });

export const Chevron = ({ size = 10, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className} aria-hidden="true">
    <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);

export const Dots = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="3.1" cy="8" r="1.35" /><circle cx="8" cy="8" r="1.35" /><circle cx="12.9" cy="8" r="1.35" />
  </svg>
);

export const Question = ({ size = 14 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6.4 6.2a1.7 1.7 0 113.2.8c-.3.5-1.1.8-1.3 1.3-.1.2-.1.4-.1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="11.4" r=".85" fill="currentColor" />
  </svg>
);

export const Undo = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <path d="M3 7h6.5A3.5 3.5 0 0113 10.5v0A3.5 3.5 0 019.5 14H6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const Redo = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M10 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <path d="M13 7H6.5A3.5 3.5 0 003 10.5v0A3.5 3.5 0 006.5 14H10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const ArrowLeft = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true"><path d="M9 4L5 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
);
export const ArrowRight = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true"><path d="M7 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
);
export const ArrowUp = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true"><path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
);
export const ArrowDown = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
);

export const FlipH = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M8 2v12" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" />
    <path d="M6 5L3 8l3 3V5zM10 5l3 3-3 3V5z" fill="currentColor" />
  </svg>
);
export const FlipV = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" />
    <path d="M5 6L8 3l3 3H5zM5 10l3 3 3-3H5z" fill="currentColor" />
  </svg>
);
export const Rotate = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M13 8a5 5 0 11-1.8-3.85" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13 2v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);
export const Invert = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 2.4A5.6 5.6 0 018 13.6V2.4z" fill="currentColor" />
  </svg>
);
export const Guides = ({ size }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <rect x="2.5" y="2.5" width="11" height="11" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2" />
    <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1" />
  </svg>
);
export const Trash = ({ size = 13 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);
export const CopyIcon = ({ size = 13 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 3.5h-7a1 1 0 00-1 1v7" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
export const DownloadIcon = ({ size = 13 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M8 2.5v8M5 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
export const Check = ({ size = 13 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Cross = ({ size = 13 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
export const Search = ({ size = 14 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);
export const DownArrowLong = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M8 2.5v9M4.5 8l3.5 3.5L11.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);
export const External = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M5.5 10.5l5-5M6.5 5.5h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);
export const Send = ({ size = 14 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M13.5 2.5L7 9M13.5 2.5l-4.2 11-2.3-4.5L2.5 6.7l11-4.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
export const Warn = ({ size = 15 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <path d="M8 2.6l5.8 10.1H2.2L8 2.6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 6.6v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="11.3" r=".75" fill="currentColor" />
  </svg>
);
export const Info = ({ size = 15 }: P) => (
  <svg {...box(size)} aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 7.3v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="5" r=".8" fill="currentColor" />
  </svg>
);
export const GitHub = ({ size = 15 }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
export const ArrowRightLong = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M3 8h10M9.5 4.5L13 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
  </svg>
);
