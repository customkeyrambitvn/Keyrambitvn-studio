import type { ReactNode } from "react";

type CompactPageTitleBarProps = {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/** Compact one-line page header below the top tab bar. */
export function CompactPageTitleBar({
  kicker,
  title,
  description,
  actions,
  className = "",
}: CompactPageTitleBarProps) {
  return (
    <div
      className={["compact-title-bar", description ? "compact-title-bar--tall" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="compact-title-bar__left">
        <p className="compact-title-bar__kicker">{kicker}</p>
        <div className="compact-title-bar__title-row">
          <h1 className="compact-title-bar__title">{title}</h1>
        </div>
        {description ? <p className="compact-title-bar__description">{description}</p> : null}
      </div>
      {actions ? <div className="compact-title-bar__actions">{actions}</div> : null}
    </div>
  );
}
