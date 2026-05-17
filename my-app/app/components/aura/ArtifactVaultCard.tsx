import type { HTMLAttributes, ReactNode } from "react";

type ArtifactVaultCardProps = HTMLAttributes<HTMLElement> & {
  /** Rarity border accent class (e.g. rarity-hiem). */
  rarityClassName?: string;
  /** Collection showcase — stronger vault lighting. */
  showcase?: boolean;
  compact?: boolean;
  children: ReactNode;
};

/** Premium inventory / collection tile — aura defines the silhouette, not a product card. */
export function ArtifactVaultCard({
  rarityClassName = "",
  showcase = false,
  compact = false,
  className = "",
  children,
  ...rest
}: ArtifactVaultCardProps) {
  return (
    <article
      className={[
        "artifact-vault",
        rarityClassName,
        showcase ? "artifact-vault--showcase" : "",
        compact ? "artifact-vault--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </article>
  );
}
