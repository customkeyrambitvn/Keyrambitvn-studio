import type { ReactNode } from "react";

type StorePageHeaderProps = {
  kicker: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Asymmetric split hero — left copy, right actions/stats (taste-skill anti-center bias). */
export function StorePageHeader({
  kicker,
  title,
  description,
  meta,
  actions,
  className = "",
}: StorePageHeaderProps) {
  return (
    <header className={`store-hero mb-6 sm:mb-8 ${className}`.trim()}>
      <div className="store-hero__grid">
        <div className="store-hero__copy min-w-0">
          <p className="store-kicker">{kicker}</p>
          <h1 className="store-title mt-2">{title}</h1>
          {description ? <p className="store-lead mt-2 max-w-[65ch]">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="store-hero__aside flex flex-shrink-0 flex-wrap items-start justify-start gap-2 md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
