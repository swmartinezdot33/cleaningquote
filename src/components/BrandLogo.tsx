interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
}

const LOGO_ICON_SRC = '/cleanquote_square_icon_padding.png';

function LogoIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_ICON_SRC}
      alt="CQ.io"
      width={40}
      height={40}
      className="h-10 w-10 flex-shrink-0 object-contain"
    />
  );
}

export function BrandLogo({ className = '', showWordmark = true }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <LogoIcon />
      {showWordmark && (
        <span className="text-xl font-semibold text-foreground tracking-tight">
          CleanQuote.io
        </span>
      )}
    </div>
  );
}
