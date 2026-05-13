"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveProductImagePath } from "../lib/productImageMatch";

type ProductImageContextValue = {
  filenames: string[] | null;
  resolve: (productName: string, explicitImage?: string | null) => string | null;
};

const ProductImageContext = createContext<ProductImageContextValue | null>(null);

export function ProductImagesProvider({ children }: { children: ReactNode }) {
  const [filenames, setFilenames] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/product-images")
      .then((r) => r.json())
      .then((data: { filenames?: string[] }) => {
        if (!cancelled) setFilenames(Array.isArray(data.filenames) ? data.filenames : []);
      })
      .catch(() => {
        if (!cancelled) setFilenames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ProductImageContextValue>(() => {
    const list = filenames ?? [];
    return {
      filenames,
      resolve: (productName: string, explicitImage?: string | null) => {
        const ex = explicitImage?.trim();
        if (ex) return ex;
        if (filenames === null) return null;
        return resolveProductImagePath(productName, list);
      },
    };
  }, [filenames]);

  return <ProductImageContext.Provider value={value}>{children}</ProductImageContext.Provider>;
}

export function useResolvedProductImage(productName: string, explicitImage?: string | null): string | null {
  const ctx = useContext(ProductImageContext);
  const ex = explicitImage?.trim();
  if (ex) return ex;
  if (!ctx) return null;
  return ctx.resolve(productName, null);
}

/** Resolve ảnh sản phẩm (dùng khi spawn Konva / logic không phải component). */
export function useProductImageResolve(): (productName: string, explicitImage?: string | null) => string | null {
  const ctx = useContext(ProductImageContext);
  return useCallback(
    (productName: string, explicitImage?: string | null) => {
      if (!ctx) return explicitImage?.trim() || null;
      return ctx.resolve(productName, explicitImage);
    },
    [ctx],
  );
}
