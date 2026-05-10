"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandHeaderBar } from "../components/BrandHeaderBar";
import { MainNavWithAuth } from "../components/MainNavWithAuth";
import { BrandWatermark } from "../components/BrandWatermark";
import { ProductImageBox } from "../components/ProductImageBox";
import { ITEMS_BY_RARITY, type ProductDef } from "../data/products";
import { productCategory } from "../lib/category";

type Rarity = "Thường" | "Hiếm" | "Siêu Hiếm" | "Combo" | "Săn Lùng" | "Secret" | "Rare Secret" | "Super Secret";

const RARITY_ORDER: Rarity[] = ["Thường", "Hiếm", "Siêu Hiếm", "Combo", "Săn Lùng", "Secret", "Rare Secret", "Super Secret"];

const GLITCH_RARITIES = new Set<Rarity>(["Secret", "Rare Secret", "Super Secret"]);

function rarityToClassName(rarity: Rarity): string {
  const classMap: Record<Rarity, string> = {
    "Thường": "rarity-thuong",
    "Hiếm": "rarity-hiem",
    "Siêu Hiếm": "rarity-sieu-hiem",
    "Combo": "rarity-combo",
    "Săn Lùng": "rarity-san-lung",
    "Secret": "rarity-secret",
    "Rare Secret": "rarity-rare-secret",
    "Super Secret": "rarity-super-secret",
  };
  return classMap[rarity];
}

function productsForRarity(rarity: Rarity): ProductDef[] {
  const list = ITEMS_BY_RARITY[rarity as keyof typeof ITEMS_BY_RARITY];
  return Array.isArray(list) ? list : [];
}

const initialExpanded = (): Record<Rarity, boolean> =>
  Object.fromEntries(RARITY_ORDER.map((r) => [r, true])) as Record<Rarity, boolean>;

const raritySectionBtn =
  "rounded-lg border px-2.5 py-1 text-xs font-medium transition enabled:hover:border-cyan-300/70 enabled:hover:bg-cyan-500/10 enabled:hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-zinc-600";

export default function CollectionPage() {
  const [expandedByRarity, setExpandedByRarity] = useState<Record<Rarity, boolean>>(initialExpanded);

  const totalProducts = useMemo(
    () => RARITY_ORDER.reduce((sum, r) => sum + productsForRarity(r).length, 0),
    []
  );

  return (
    <main className="relative min-h-screen bg-[#06070f] text-zinc-100">
      <BrandWatermark />
      <div className="relative z-10 mx-auto w-full max-w-full px-4 py-5 sm:px-6 lg:max-w-[90rem] lg:px-8">
        <BrandHeaderBar />
        <MainNavWithAuth />
        <header className="mb-5 rounded-2xl border border-cyan-500/30 bg-[#0b1020]/85 p-4 shadow-[0_0_40px_rgba(0,170,255,0.1)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Keyrambitvn</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-50">Bộ Sưu Tập Keyrambit</h1>
          <p className="mt-1 text-sm text-zinc-400">Tổng: {totalProducts} sản phẩm</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex rounded-full border border-cyan-400/50 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-200 hover:text-white"
            >
              Quay lại Store
            </Link>
          </div>
        </header>

        <div className="space-y-6 md:space-y-8">
          {RARITY_ORDER.map((rarity) => {
            const products = productsForRarity(rarity);
            if (products.length === 0) return null;
            const expanded = expandedByRarity[rarity] !== false;
            const headingId = `collection-rarity-${rarity.replace(/\s+/g, "-")}`;

            return (
              <section key={rarity} aria-labelledby={headingId}>
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-700/80 bg-[#0a0f1d] px-3 py-2.5 sm:px-4 sm:py-3 ${rarityToClassName(rarity)} ${
                    GLITCH_RARITIES.has(rarity) ? "rarity-glitch-tier" : ""
                  } ${expanded ? "mb-2" : "mb-0"}`}
                >
                  <h2 id={headingId} className="text-base font-semibold tracking-wide sm:text-lg">
                    {rarity}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs text-zinc-400 sm:text-sm">{products.length} mục</span>
                    <div className="flex items-center gap-1.5" role="group" aria-label={`Thu gọn hoặc mở rộng: ${rarity}`}>
                      <button
                        type="button"
                        disabled={!expanded}
                        onClick={() => setExpandedByRarity((p) => ({ ...p, [rarity]: false }))}
                        className={`border-zinc-600 bg-zinc-900/50 text-zinc-200 ${raritySectionBtn}`}
                      >
                        Thu gọn
                      </button>
                      <button
                        type="button"
                        disabled={expanded}
                        onClick={() => setExpandedByRarity((p) => ({ ...p, [rarity]: true }))}
                        className={`border-zinc-600 bg-zinc-900/50 text-zinc-200 ${raritySectionBtn}`}
                      >
                        Mở rộng
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-5 xl:gap-3 pt-0.5">
                      {products.map((product) => (
                        <article
                          key={product.name}
                          className={`overflow-visible rounded-lg border border-zinc-700 bg-[#0a0f1d] p-2 shadow-[0_0_24px_rgba(0,0,0,0.35)] transition duration-300 ease-out motion-reduce:transition-none sm:p-2.5 ${rarityToClassName(
                            rarity
                          )} hover:-translate-y-0.5 hover:border-zinc-500 hover:shadow-[0_0_28px_rgba(34,211,238,0.14)]`}
                        >
                          <ProductImageBox
                            name={product.name}
                            image={product.image}
                            rarity={rarity}
                            imageFit="contain"
                            compact
                          />
                          <h3 className="mt-1.5 text-xs font-semibold leading-snug text-zinc-100 sm:text-[13px]">{product.name}</h3>
                          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-[11px]">{productCategory(product.name)}</p>
                          <p
                            className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] sm:mt-2 sm:px-2.5 sm:py-0.5 sm:text-[11px] ${rarityToClassName(rarity)}`}
                          >
                            {rarity}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
