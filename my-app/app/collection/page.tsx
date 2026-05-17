"use client";

import { useMemo, useState } from "react";
import { CompactPageTitleBar } from "../components/CompactPageTitleBar";
import { CompactTopNav } from "../components/CompactTopNav";
import { ArtifactVaultCard } from "../components/aura";
import { StoreButton, StoreShell } from "../components/store";
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

const raritySectionBtn = "store-btn store-btn--ghost store-btn--sm";

export default function CollectionPage() {
  const [expandedByRarity, setExpandedByRarity] = useState<Record<Rarity, boolean>>(initialExpanded);

  const totalProducts = useMemo(
    () => RARITY_ORDER.reduce((sum, r) => sum + productsForRarity(r).length, 0),
    []
  );

  return (
    <StoreShell contentClassName="app-page--compact min-h-[100dvh] max-w-[90rem] flex flex-col">
      <div className="app-page__chrome shrink-0">
        <CompactTopNav />
      </div>
      <div className="app-page__workspace">
        <CompactPageTitleBar
          kicker="Catalogue"
          title="Bộ Sưu Tập Keyrambit"
          description={`Tổng ${totalProducts} sản phẩm theo độ hiếm.`}
          actions={
            <StoreButton href="/" variant="secondary" size="sm">
              Quay lại Store
            </StoreButton>
          }
        />

        <div className="space-y-6 md:space-y-8">
          {RARITY_ORDER.map((rarity) => {
            const products = productsForRarity(rarity);
            if (products.length === 0) return null;
            const expanded = expandedByRarity[rarity] !== false;
            const headingId = `collection-rarity-${rarity.replace(/\s+/g, "-")}`;

            return (
              <section key={rarity} aria-labelledby={headingId}>
                <div
                  className={`store-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 ${rarityToClassName(rarity)} ${
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
                        className={raritySectionBtn}
                      >
                        Thu gọn
                      </button>
                      <button
                        type="button"
                        disabled={expanded}
                        onClick={() => setExpandedByRarity((p) => ({ ...p, [rarity]: true }))}
                        className={raritySectionBtn}
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
                        <ArtifactVaultCard
                          key={product.name}
                          rarityClassName={rarityToClassName(rarity)}
                          showcase
                          compact
                          className="p-2 sm:p-2.5"
                        >
                          <div className="artifact-vault__visual">
                            <ProductImageBox
                              name={product.name}
                              image={product.image}
                              rarity={rarity}
                              imageFit="contain"
                              compact
                              frameless
                              auraPresentation="showcase"
                              interactiveAura
                            />
                          </div>
                          <h3 className="artifact-vault__title mt-1.5 text-xs font-semibold leading-snug text-zinc-100 sm:text-[13px]">
                            {product.name}
                          </h3>
                          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-[11px]">{productCategory(product.name)}</p>
                          <p
                            className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] sm:mt-2 sm:px-2.5 sm:py-0.5 sm:text-[11px] ${rarityToClassName(rarity)}`}
                          >
                            {rarity}
                          </p>
                        </ArtifactVaultCard>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </StoreShell>
  );
}
