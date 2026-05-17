import type { ReactNode } from "react";

type CinematicOverlayProps = {
  children: ReactNode;
  depth?: "soft" | "deep" | "ritual";
  className?: string;
};

/** Full-screen ceremonial dim + vignette. */
export function CinematicOverlay({ children, depth = "deep", className = "" }: CinematicOverlayProps) {
  return (
    <div className={`cinematic-overlay cinematic-overlay--${depth} ${className}`.trim()}>
      <div className="cinematic-overlay__shade" aria-hidden />
      <div className="cinematic-overlay__vignette" aria-hidden />
      <div className="cinematic-overlay__content">{children}</div>
    </div>
  );
}
