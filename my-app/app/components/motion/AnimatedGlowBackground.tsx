/** Slow drifting radial glows + subtle grid — fixed layers, GPU-friendly (transform/opacity). */
export function AnimatedGlowBackground() {
  return (
    <>
      <div className="motion-bg motion-bg--base" aria-hidden />
      <div className="motion-bg motion-bg--glow motion-bg--glow-a" aria-hidden />
      <div className="motion-bg motion-bg--glow motion-bg--glow-b" aria-hidden />
      <div className="motion-bg motion-bg--glow motion-bg--glow-c" aria-hidden />
      <div className="motion-bg motion-bg--grid" aria-hidden />
    </>
  );
}
