// components/seal.tsx
// The Veritas Verdict Seal — consensus ring closing on a V / checkmark.
// Usage: <Seal className="text-[var(--verum)]" size={28} />  (spins by default)

export function Seal({
  size = 28,
  spin = true,
  className = "",
}: {
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g
        style={
          spin
            ? { transformOrigin: "50px 50px", animation: "veritas-seal-spin 36s linear infinite" }
            : undefined
        }
      >
        <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="2" strokeDasharray="1.2 5" opacity="0.7" />
      </g>
      <circle cx="50" cy="50" r="38.5" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path d="M35 38 L50 64 L65 38" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
      <style>{`@keyframes veritas-seal-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce){ g { animation: none !important; } }`}</style>
    </svg>
  );
}
