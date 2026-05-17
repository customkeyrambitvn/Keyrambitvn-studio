type RevealBackdropProps = {
  active?: boolean;
};

/** Center-focus ring behind reveal subject. */
export function RevealBackdrop({ active = true }: RevealBackdropProps) {
  if (!active) return null;
  return (
    <>
      <div className="reveal-backdrop reveal-backdrop__halo" aria-hidden />
      <div className="reveal-backdrop reveal-backdrop__floor" aria-hidden />
    </>
  );
}
