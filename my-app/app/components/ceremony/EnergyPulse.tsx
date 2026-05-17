type EnergyPulseProps = {
  variant?: "idle" | "charge" | "implode" | "success" | "fail";
  className?: string;
};

/** Fusion core energy — transform/opacity only. */
export function EnergyPulse({ variant = "idle", className = "" }: EnergyPulseProps) {
  return (
    <div className={`energy-pulse energy-pulse--${variant} ${className}`.trim()} aria-hidden>
      <div className="energy-pulse__ring energy-pulse__ring--outer" />
      <div className="energy-pulse__ring energy-pulse__ring--inner" />
      <div className="energy-pulse__core" />
    </div>
  );
}
