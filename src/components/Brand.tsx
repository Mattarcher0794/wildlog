import { Link } from "@tanstack/react-router";

/**
 * Circular Wildlog badge — peach fill, cream ring, plum bubble "W".
 * Modelled on the hand-painted source sign.
 */
export function BrandBadge({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-peach ring-2 ring-paper ring-inset ${className}`}
    >
      <span className="font-display text-base leading-none text-plum">W</span>
    </span>
  );
}

/** Full Wildlog wordmark — badge + uppercase bubble lettering. */
export function Wordmark({
  withBadge = true,
  className = "",
}: {
  withBadge?: boolean;
  className?: string;
}) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 text-foreground ${className}`}>
      {withBadge && <BrandBadge />}
      <span className="font-display text-2xl">Wildlog</span>
    </Link>
  );
}
