"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandHeaderBar } from "../components/BrandHeaderBar";
import { BrandWatermark } from "../components/BrandWatermark";
import { ProductImageBox } from "../components/ProductImageBox";
import { productCategory } from "../lib/category";

type Rarity = "Thường" | "Hiếm" | "Siêu Hiếm" | "Combo" | "Săn Lùng" | "Secret" | "Rare Secret" | "Super Secret";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

const STORAGE_KEY = "keyrambit-inventory";
const INVENTORY_TITLE_KEY = "keyrambit-inventory-title";
const DEFAULT_INVENTORY_TITLE = "Keyrambit Collection";

const RARITY_ORDER: Rarity[] = ["Thường", "Hiếm", "Siêu Hiếm", "Combo", "Săn Lùng", "Secret", "Rare Secret", "Super Secret"];
const GLITCH_RARITIES = new Set<Rarity>(["Secret", "Rare Secret", "Super Secret"]);

function normalizeRarity(rawRarity: string): Rarity {
  const value = rawRarity.trim();
  const aliasMap: Record<string, Rarity> = {
    "Thường": "Thường",
    "Hiếm": "Hiếm",
    "Siêu Hiếm": "Siêu Hiếm",
    "Combo": "Combo",
    "Săn Lùng": "Săn Lùng",
    "Secret": "Secret",
    "Rare Secret": "Rare Secret",
    "Super Secret": "Super Secret",
  };
  return aliasMap[value] ?? "Thường";
}

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

function loadInventory(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as InventoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInventoryTitle(): string {
  if (typeof window === "undefined") return DEFAULT_INVENTORY_TITLE;
  const raw = window.localStorage.getItem(INVENTORY_TITLE_KEY);
  if (raw == null || raw.trim() === "") return DEFAULT_INVENTORY_TITLE;
  return raw.trim();
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryTitle, setInventoryTitle] = useState(DEFAULT_INVENTORY_TITLE);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadInventory());
    setInventoryTitle(loadInventoryTitle());
  }, []);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!showClearConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowClearConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showClearConfirm]);

  const saveInventoryTitle = () => {
    const next = titleDraft.trim() === "" ? DEFAULT_INVENTORY_TITLE : titleDraft.trim();
    window.localStorage.setItem(INVENTORY_TITLE_KEY, next);
    setInventoryTitle(next);
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setTitleDraft(inventoryTitle);
    setIsEditingTitle(false);
  };

  const startEditTitle = () => {
    setTitleDraft(inventoryTitle);
    setIsEditingTitle(true);
  };

  const confirmClearInventory = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    setItems([]);
    setShowClearConfirm(false);
  };

  const rarityCounts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const normalized = normalizeRarity(item.rarity);
        acc[normalized] += 1;
        return acc;
      },
      {
        "Thường": 0,
        "Hiếm": 0,
        "Siêu Hiếm": 0,
        "Combo": 0,
        "Săn Lùng": 0,
        "Secret": 0,
        "Rare Secret": 0,
        "Super Secret": 0,
      } as Record<Rarity, number>
    );
  }, [items]);

  return (
    <main className="relative min-h-screen bg-[#06070f] text-zinc-100">
      <BrandWatermark />
      <div className="relative z-10 mx-auto w-full max-w-md px-4 py-5 sm:max-w-4xl sm:px-6">
        <BrandHeaderBar />
        <header className="mb-5 rounded-2xl border border-purple-500/35 bg-[#0b1020]/85 p-4 shadow-[0_0_40px_rgba(150,80,255,0.15)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">KHO KEYRAMBIT</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {isEditingTitle ? (
                  <>
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveInventoryTitle();
                        if (e.key === "Escape") cancelEditTitle();
                      }}
                      className="min-w-[12rem] flex-1 rounded-lg border border-violet-500/50 bg-[#0a0f1d] px-3 py-2 text-lg font-semibold text-zinc-100 outline-none ring-0 focus:border-violet-400 focus:shadow-[0_0_16px_rgba(167,139,250,0.35)] sm:max-w-md"
                      aria-label="Tên kho"
                    />
                    <button
                      type="button"
                      onClick={saveInventoryTitle}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditTitle}
                      className="rounded-lg border border-zinc-600 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold">{inventoryTitle}</h1>
                    <button
                      type="button"
                      onClick={startEditTitle}
                      className="rounded-lg border border-violet-500/40 bg-violet-500/5 px-3 py-1.5 text-xs text-violet-200 transition hover:border-violet-400 hover:bg-violet-500/15"
                    >
                      Sửa tên
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href="/"
                className="rounded-full border border-violet-400/55 px-4 py-2 text-sm text-violet-200 transition hover:border-violet-200 hover:text-white"
              >
                Mở Box Keyrambit
              </Link>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="rounded-full border border-red-500/70 bg-red-950/40 px-4 py-2 text-sm text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)] transition hover:border-red-400 hover:bg-red-950/60 hover:shadow-[0_0_22px_rgba(239,68,68,0.4)]"
              >
                Xóa toàn bộ kho
              </button>
            </div>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {RARITY_ORDER.map((rarity) => (
            <div
              key={rarity}
              className={`rounded-xl border border-zinc-700/80 bg-[#0a0f1d] p-3 text-center ${rarityToClassName(rarity)} ${
                GLITCH_RARITIES.has(rarity) ? "rarity-glitch-tier" : ""
              }`}
            >
              <p className="tracking-[0.08em]">{rarity}</p>
              <p className="mt-1 text-base font-semibold">{rarityCounts[rarity]}</p>
            </div>
          ))}
        </section>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#0a0f1d] p-8 text-center text-zinc-400">
            Chưa có vật phẩm nào. Mở thêm blind box để xây dựng kho đồ.
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const normalizedRarity = normalizeRarity(item.rarity);
              return (
                <article
                  key={item.id}
                  className={`overflow-visible rounded-xl border border-zinc-700 bg-[#0a0f1d] p-4 ${rarityToClassName(normalizedRarity)}`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{item.boxName}</p>
                  <div className="mt-3">
                    <ProductImageBox name={item.name} image={item.image} rarity={normalizedRarity} />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{item.name}</h2>
                  <p className="text-sm text-zinc-400">{productCategory(item.name)}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`rounded-full border px-3 py-1 ${rarityToClassName(normalizedRarity)}`}>{normalizedRarity}</span>
                    <span className="text-zinc-400">{new Date(item.acquiredAt).toLocaleDateString()}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03040a]/75 px-4 backdrop-blur-md"
          onClick={() => setShowClearConfirm(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-inventory-title"
            className="w-full max-w-md rounded-2xl border border-red-500/35 bg-[#0b1020]/95 p-5 shadow-[0_0_48px_rgba(239,68,68,0.2),0_0_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="clear-inventory-title" className="text-sm leading-relaxed text-zinc-200">
              Bạn có chắc muốn xóa toàn bộ vật phẩm trong kho không? Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/80"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmClearInventory}
                className="rounded-lg border border-red-500/80 bg-red-950/50 px-4 py-2.5 text-sm font-medium text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.45)] transition hover:border-red-400 hover:bg-red-950/70 hover:shadow-[0_0_32px_rgba(239,68,68,0.55)]"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
