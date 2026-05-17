"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { useSfx } from "@/app/contexts/SfxContext";

type Variant = "action" | "primary" | "secondary" | "ghost";

type MotionButtonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClass: Record<Variant, string> = {
  action: "motion-btn motion-btn--action store-btn store-btn--primary store-btn--lg",
  primary: "motion-btn store-btn store-btn--primary",
  secondary: "motion-btn store-btn store-btn--secondary",
  ghost: "motion-btn store-btn store-btn--ghost",
};

/** Game-style CTA with subtle energy pulse + UI SFX. */
export function MotionButton({
  variant = "primary",
  className = "",
  children,
  href,
  onClick,
  onPointerEnter,
  disabled,
  ...rest
}: MotionButtonProps) {
  const { playHover, playClick } = useSfx();
  const cn = [variantClass[variant], className].filter(Boolean).join(" ");

  const handleEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled) playHover("ui", "side", 0.85);
    onPointerEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playClick("side");
    }
    onClick?.(e);
  };

  if (href) {
    return (
      <Link
        href={href}
        className={`${cn}${disabled ? " pointer-events-none opacity-45" : ""}`}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (!disabled) playClick("side");
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
        {...(rest as object)}
      >
        <span className="motion-btn__shine" aria-hidden />
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn}
      disabled={disabled}
      onPointerEnter={handleEnter}
      onClick={handleClick}
      {...rest}
    >
      <span className="motion-btn__shine" aria-hidden />
      {children}
    </button>
  );
}
