interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
}

const LOGO_ICON_SRC = '/CleanQuote Logo Icon.png';

function LogoIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_ICON_SRC}
      alt="CQ.io"
      width={32}
      height={32}
      className="h-8 w-8 flex-shrink-0 object-contain"
    />
  );
}

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
