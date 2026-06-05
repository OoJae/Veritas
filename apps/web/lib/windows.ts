// Betting / join window presets (seconds). After the window closes, anyone can
// trigger AI resolution by paying the verdict fee.
export const WINDOW_PRESETS: { label: string; seconds: number }[] = [
  { label: "2 minutes", seconds: 120 },
  { label: "10 minutes", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
];

export const DEFAULT_WINDOW_SECONDS = 600;
