interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
}

const LogoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className="h-8 w-8 flex-shrink-0"
    aria-hidden
  >
    <defs>
      <linearGradient id="cq-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="0" fill="url(#cq-logo-gradient)" />
    <text
      x="50"
      y="68"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="42"
      fontWeight="700"
      fill="white"
      textAnchor="middle"
    >
      CQ
    </text>
  </svg>
);

export function BrandLogo({ className = '', showWordmark = true }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon />
      {showWordmark && (
        <span className="text-xl font-semibold text-foreground tracking-tight">
          CleanQuote.io
        </span>
      )}
    </div>
  );
}
