"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "store-btn store-btn--primary",
  secondary: "store-btn store-btn--secondary",
  ghost: "store-btn store-btn--ghost",
  danger: "store-btn store-btn--danger",
};

const sizeClass: Record<Size, string> = {
  sm: "store-btn--sm",
  md: "",
  lg: "store-btn--lg",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkProps = BaseProps & {
  href: string;
};

function classes(variant: Variant, size: Size, className: string) {
  return [variantClass[variant], sizeClass[size], className].filter(Boolean).join(" ");
}

export function StoreButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  href,
  ...rest
}: ButtonProps | LinkProps) {
  const cn = classes(variant, size, className);

  if (href) {
    const { disabled, ...linkRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <Link
        href={href}
        className={`${cn}${disabled ? " pointer-events-none opacity-45" : ""}`}
        aria-disabled={disabled || undefined}
        {...(linkRest as object)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cn} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
