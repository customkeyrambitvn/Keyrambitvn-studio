const PARTICLES = [
  { left: 8, top: 18, size: 2, dur: 22, delay: 0 },
  { left: 22, top: 72, size: 1.5, dur: 28, delay: 2 },
  { left: 38, top: 34, size: 2.5, dur: 26, delay: 1 },
  { left: 55, top: 82, size: 1.5, dur: 24, delay: 3 },
  { left: 68, top: 12, size: 2, dur: 30, delay: 0.5 },
  { left: 78, top: 48, size: 1.5, dur: 20, delay: 4 },
  { left: 88, top: 68, size: 2, dur: 27, delay: 1.5 },
  { left: 14, top: 52, size: 1.5, dur: 25, delay: 2.5 },
  { left: 44, top: 8, size: 2, dur: 23, delay: 3.5 },
  { left: 92, top: 28, size: 1.5, dur: 29, delay: 1 },
  { left: 32, top: 88, size: 2, dur: 21, delay: 4.5 },
  { left: 62, top: 58, size: 1.5, dur: 26, delay: 0.8 },
] as const;

type Density = "ambient" | "opening";

type ParticleLayerProps = {
  density?: Density;
  className?: string;
};

/** Floating dust — transform-only, low count for mobile performance. */
export function ParticleLayer({ density = "ambient", className = "" }: ParticleLayerProps) {
  const list = density === "opening" ? PARTICLES : PARTICLES.slice(0, 8);
  const opacity = density === "opening" ? 0.55 : 0.35;

  return (
    <div className={`motion-particles ${className}`.trim()} aria-hidden style={{ ["--particle-opacity" as string]: opacity }}>
      {list.map((p, i) => (
        <span
          key={i}
          className="motion-particle"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              ["--dur" as string]: `${p.dur}s`,
              ["--delay" as string]: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
