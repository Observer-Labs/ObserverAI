import Link from "next/link";

/** Canonical Observer brand mark: orange eye icon. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke="#f97316" strokeWidth="1.2" opacity="0.5" />
      <path
        d="M3.5 12C5.5 7.5 8.5 5.5 12 5.5C15.5 5.5 18.5 7.5 20.5 12C18.5 16.5 15.5 18.5 12 18.5C8.5 18.5 5.5 16.5 3.5 12Z"
        stroke="#f97316" strokeWidth="1.3" fill="none"
      />
      <circle cx="12" cy="12" r="3" fill="#f97316" />
      <circle cx="13.2" cy="10.8" r="0.9" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

interface LogoProps {
  /** Icon size in px. */
  size?: number;
  /** Wordmark font size. */
  textSize?: string;
  /** Wordmark color; defaults to theme foreground. Use "#fff" on dark surfaces. */
  color?: string;
  gap?: number;
  /** When set, the logo is wrapped in a Link to this path. */
  href?: string;
  className?: string;
}

/** Canonical Observer logo: mark + italic wordmark. Use everywhere a logo is shown. */
export default function Logo({
  size = 24,
  textSize = "0.95rem",
  color = "var(--foreground)",
  gap = 9,
  href,
  className,
}: LogoProps) {
  const inner = (
    <>
      <LogoMark size={size} />
      <span style={{ color, fontWeight: 700, fontSize: textSize, fontStyle: "italic", letterSpacing: "-0.02em" }}>
        Observer
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap }}>
        {inner}
      </Link>
    );
  }
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap }}>
      {inner}
    </span>
  );
}
