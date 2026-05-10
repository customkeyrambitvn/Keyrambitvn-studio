"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BrandHeaderBar } from "../components/BrandHeaderBar";
import { BrandWatermark } from "../components/BrandWatermark";
import { FusionAnimationModal, type FusionAnimResult, type FusionAnimSnapshot } from "../components/FusionAnimationModal";
import { MainTabNav } from "../components/MainTabNav";
import { ProductImageBox } from "../components/ProductImageBox";
import {
  FUSION_BOX_NAME,
  HIGH_MAX_SLOTS,
  HIGH_TARGET_CONTRIB,
  type HighTargetRarity,
  type NormalRecipeId,
  normalFusionChance,
  normalizeInventoryRarity,
  NORMAL_RECIPES,
  highFusionChance,
  isHighTierInputAllowed,
  pickRandomProduct,
  rollSuccess,
} from "../lib/fusion-logic";
import { productCategory } from "../lib/category";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

const STORAGE_KEY = "keyrambit-inventory";

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

function saveInventory(items: InventoryItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type FusionMode = "normal" | "high";

function emptySlots(count: number): (InventoryItem | null)[] {
  return Array.from({ length: count }, () => null);
}

function rarityToClassName(r: string): string {
  const n = normalizeInventoryRarity(r);
  const map: Record<string, string> = {
    "Thường": "rarity-thuong",
    "Hiếm": "rarity-hiem",
    "Siêu Hiếm": "rarity-sieu-hiem",
    "Combo": "rarity-combo",
    "Săn Lùng": "rarity-san-lung",
    Secret: "rarity-secret",
    "Rare Secret": "rarity-rare-secret",
    "Super Secret": "rarity-super-secret",
  };
  return map[n] ?? "rarity-thuong";
}

const GLITCH = new Set(["Secret", "Rare Secret", "Super Secret"]);

type FullFusionSnapshot = {
  items: InventoryItem[];
  mode: FusionMode;
  normalRecipe: NormalRecipeId;
  highTarget: HighTargetRarity;
  successPercent: number;
  maxSlots: number;
};

function rarityGlowStyle(rarity: string): CSSProperties {
  const n = normalizeInventoryRarity(rarity);
  switch (n) {
    case "Thường":
      return { filter: "drop-shadow(0 0 18px rgba(148,163,184,0.65))" };
    case "Hiếm":
      return { filter: "drop-shadow(0 0 22px rgba(34,211,238,0.6))" };
    case "Siêu Hiếm":
      return { filter: "drop-shadow(0 0 24px rgba(168,85,247,0.58))" };
    case "Combo":
      return { filter: "drop-shadow(0 0 20px rgba(74,222,128,0.55))" };
    case "Săn Lùng":
      return { filter: "drop-shadow(0 0 24px rgba(251,146,60,0.58))" };
    case "Secret":
      return { filter: "drop-shadow(0 0 28px rgba(248,113,113,0.65))" };
    case "Rare Secret":
      return { filter: "drop-shadow(0 0 30px rgba(244,114,182,0.62))" };
    case "Super Secret":
      return { filter: "drop-shadow(0 0 34px rgba(250,204,21,0.7))" };
    default:
      return { filter: "drop-shadow(0 0 18px rgba(34,211,238,0.45))" };
  }
}

export default function FusionPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mode, setMode] = useState<FusionMode>("normal");
  const [normalRecipe, setNormalRecipe] = useState<NormalRecipeId>("thuong-hiem");
  const [highTarget, setHighTarget] = useState<HighTargetRarity>("Secret");
  const [slots, setSlots] = useState<(InventoryItem | null)[]>(() => emptySlots(5));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; item?: InventoryItem }>(null);
  const [fusionAnimOpen, setFusionAnimOpen] = useState(false);
  const [animSnapshot, setAnimSnapshot] = useState<FusionAnimSnapshot | null>(null);
  const fusionSnapRef = useRef<FullFusionSnapshot | null>(null);
  const fusionCommitLockedRef = useRef(false);
  const fusionResultCacheRef = useRef<FusionAnimResult | null>(null);

  useEffect(() => {
    setInventory(loadInventory());
  }, []);

  const maxSlots = mode === "normal" ? NORMAL_RECIPES[normalRecipe].maxSlots : HIGH_MAX_SLOTS;

  useEffect(() => {
    setSlots(emptySlots(maxSlots));
  }, [mode, normalRecipe, highTarget, maxSlots]);

  const slotIds = useMemo(() => new Set(slots.filter(Boolean).map((s) => s!.id)), [slots]);

  const available = useMemo(
    () => inventory.filter((i) => !slotIds.has(i.id)),
    [inventory, slotIds]
  );

  const allowedPicker = useMemo(() => {
    if (mode === "normal") {
      const need = NORMAL_RECIPES[normalRecipe].input;
      return available.filter((i) => normalizeInventoryRarity(i.rarity) === need);
    }
    return available.filter((i) => isHighTierInputAllowed(normalizeInventoryRarity(i.rarity)));
  }, [mode, normalRecipe, available]);

  const filledItems = useMemo(() => slots.filter((s): s is InventoryItem => s != null), [slots]);

  const successPercent = useMemo(() => {
    if (mode === "normal") {
      return normalFusionChance(normalRecipe, filledItems.length);
    }
    return highFusionChance(
      highTarget,
      filledItems.map((i) => normalizeInventoryRarity(i.rarity))
    );
  }, [mode, normalRecipe, highTarget, filledItems]);

  const canFuse = filledItems.length > 0;

  const validationError = useMemo(() => {
    if (filledItems.length === 0) return "Chọn ít nhất một vật phẩm.";
    if (mode === "normal") {
      const need = NORMAL_RECIPES[normalRecipe].input;
      for (const it of filledItems) {
        if (normalizeInventoryRarity(it.rarity) !== need) {
          return `Chỉ dùng độ hiếm: ${need}`;
        }
      }
    } else {
      for (const it of filledItems) {
        if (!isHighTierInputAllowed(normalizeInventoryRarity(it.rarity))) {
          return "Chỉ Thường, Hiếm, Siêu Hiếm, Săn Lùng.";
        }
      }
    }
    return null;
  }, [mode, normalRecipe, filledItems]);

  const addToFirstEmpty = useCallback(
    (item: InventoryItem) => {
      setSlots((prev) => {
        const idx = prev.findIndex((s) => s == null);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = item;
        return next;
      });
    },
    []
  );

  const clearSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const openFuse = () => {
    if (!canFuse || validationError) return;
    setConfirmOpen(true);
  };

  const handleFusionCommit = useCallback((): FusionAnimResult => {
    if (fusionCommitLockedRef.current && fusionResultCacheRef.current) {
      return fusionResultCacheRef.current;
    }
    const snap = fusionSnapRef.current;
    if (!snap || snap.items.length === 0) {
      return { ok: false };
    }
    fusionCommitLockedRef.current = true;

    const ids = new Set(snap.items.map((i) => i.id));
    const current = loadInventory();
    const remaining = current.filter((i) => !ids.has(i.id));
    const ok = rollSuccess(snap.successPercent);
    let reward: InventoryItem | undefined;

    if (ok) {
      if (snap.mode === "normal") {
        const out = NORMAL_RECIPES[snap.normalRecipe].output;
        const product = pickRandomProduct(out);
        reward = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          name: product.name,
          rarity: out,
          boxName: FUSION_BOX_NAME,
          acquiredAt: new Date().toISOString(),
          ...(product.image ? { image: product.image } : {}),
        };
        saveInventory([reward, ...remaining]);
      } else {
        const product = pickRandomProduct(snap.highTarget);
        reward = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          name: product.name,
          rarity: snap.highTarget,
          boxName: FUSION_BOX_NAME,
          acquiredAt: new Date().toISOString(),
          ...(product.image ? { image: product.image } : {}),
        };
        saveInventory([reward, ...remaining]);
      }
    } else {
      saveInventory(remaining);
    }

    const res: FusionAnimResult = { ok, item: reward };
    fusionResultCacheRef.current = res;
    return res;
  }, []);

  const onFusionAnimationComplete = useCallback((fusionResult: FusionAnimResult) => {
    const slotsToClear = fusionSnapRef.current?.maxSlots ?? maxSlots;
    setFusionAnimOpen(false);
    setAnimSnapshot(null);
    fusionSnapRef.current = null;
    fusionCommitLockedRef.current = false;
    fusionResultCacheRef.current = null;
    setInventory(loadInventory());
    setSlots(emptySlots(slotsToClear));
    setResult(fusionResult);
  }, [maxSlots]);

  const startFusionAfterConfirm = () => {
    if (!canFuse || validationError) {
      setConfirmOpen(false);
      return;
    }
    fusionSnapRef.current = {
      items: [...filledItems],
      mode,
      normalRecipe,
      highTarget,
      successPercent,
      maxSlots,
    };
    fusionCommitLockedRef.current = false;
    fusionResultCacheRef.current = null;
    setAnimSnapshot({ items: [...filledItems], maxSlots });
    setConfirmOpen(false);
    setFusionAnimOpen(true);
  };

  const targetLabel =
    mode === "normal" ? NORMAL_RECIPES[normalRecipe].output : highTarget;

  return (
    <main className="relative min-h-screen bg-[#06070f] text-zinc-100">
      <BrandWatermark />
      <div className="relative z-10 mx-auto w-full max-w-md px-4 py-5 sm:max-w-3xl sm:px-6">
        <BrandHeaderBar />
        <MainTabNav />

        <header className="mb-5 rounded-2xl border border-fuchsia-500/30 bg-[#0b1020]/85 p-4 shadow-[0_0_40px_rgba(180,80,255,0.12)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Fusion Lab</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl font-semibold">Dung Hợp</h1>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
              <Link
                href="/collection"
                className="rounded-full border border-fuchsia-400/50 px-4 py-2 text-sm text-fuchsia-200 transition hover:border-fuchsia-200 hover:text-white"
              >
                Bộ Sưu Tập
              </Link>
              <Link
                href="/inventory"
                className="rounded-full border border-fuchsia-400/50 px-4 py-2 text-sm text-fuchsia-200 transition hover:border-fuchsia-200 hover:text-white"
              >
                Kho ({inventory.length})
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-4 flex gap-1 rounded-xl border border-zinc-700/80 bg-[#0a0f1d] p-1">
          <button
            type="button"
            onClick={() => setMode("normal")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:text-base ${
              mode === "normal"
                ? "bg-fuchsia-500/20 text-fuchsia-100 ring-1 ring-fuchsia-400/40"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            Thường (tối đa 5)
          </button>
          <button
            type="button"
            onClick={() => setMode("high")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:text-base ${
              mode === "high"
                ? "bg-fuchsia-500/20 text-fuchsia-100 ring-1 ring-fuchsia-400/40"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            Cao cấp (tối đa 10)
          </button>
        </div>

        {mode === "normal" ? (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Công thức</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(NORMAL_RECIPES) as NormalRecipeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNormalRecipe(id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    normalRecipe === id
                      ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100"
                      : "border-zinc-600 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {NORMAL_RECIPES[id].label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Mục tiêu độ hiếm</p>
            <div className="flex flex-wrap gap-2">
              {(["Secret", "Rare Secret", "Super Secret"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHighTarget(t)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${rarityToClassName(t)} ${
                    highTarget === t ? "ring-2 ring-fuchsia-400/50" : ""
                  } ${GLITCH.has(t) ? "rarity-glitch-tier" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Đóng góp mỗi ô: Thường {HIGH_TARGET_CONTRIB[highTarget]["Thường"]}% · Hiếm{" "}
              {HIGH_TARGET_CONTRIB[highTarget]["Hiếm"]}% · Siêu Hiếm {HIGH_TARGET_CONTRIB[highTarget]["Siêu Hiếm"]}% ·
              Săn Lùng {HIGH_TARGET_CONTRIB[highTarget]["Săn Lùng"]}%
            </p>
          </div>
        )}

        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm text-zinc-400">
            Mục tiêu: <span className="font-medium text-zinc-200">{targetLabel}</span>
          </p>
          <p className="text-sm font-semibold text-fuchsia-300">Cơ hội: {successPercent.toFixed(1)}%</p>
        </div>

        {validationError && filledItems.length > 0 && (
          <p className="mb-2 text-xs text-amber-400/90">{validationError}</p>
        )}

        <p className="mb-2 text-xs text-zinc-500">Ô dung hợp — bấm ô để trả vật phẩm ra</p>
        <div
          className={`mb-6 grid gap-2 ${maxSlots <= 5 ? "grid-cols-5 sm:grid-cols-5" : "grid-cols-5 sm:grid-cols-5 md:grid-cols-10"}`}
        >
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => s && clearSlot(i)}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-600 bg-zinc-900/30 p-1 text-center transition hover:border-zinc-500 sm:min-h-[5rem] ${
                s ? "border-solid border-zinc-500 bg-[#0d1222]" : ""
              }`}
            >
              {s ? (
                <>
                  <span className="line-clamp-2 text-[10px] font-medium leading-tight text-zinc-200 sm:text-xs">
                    {s.name}
                  </span>
                  <span className={`mt-1 rounded px-1.5 py-0.5 text-[9px] ${rarityToClassName(s.rarity)}`}>
                    {normalizeInventoryRarity(s.rarity)}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-zinc-600 sm:text-xs">
                  {i + 1}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!canFuse || !!validationError}
          onClick={openFuse}
          className="mb-8 w-full rounded-xl border border-fuchsia-400/55 bg-fuchsia-500/15 py-3 text-base font-semibold text-fuchsia-100 shadow-[0_0_24px_rgba(192,38,211,0.15)] transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Dung Hợp
        </button>

        <section className="rounded-2xl border border-zinc-700/80 bg-[#0a0f1d]/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">
            Kho — chọn vật phẩm ({allowedPicker.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {mode === "normal"
              ? `Chỉ hiện: ${NORMAL_RECIPES[normalRecipe].input}`
              : "Thường, Hiếm, Siêu Hiếm, Săn Lùng"}
          </p>
          <div className="mt-3 max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto pr-1">
            {allowedPicker.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">Không có vật phẩm phù hợp trong kho.</p>
            ) : (
              allowedPicker.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToFirstEmpty(item)}
                  disabled={slots.every(Boolean)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/40 p-3 text-left transition hover:border-fuchsia-500/40 hover:bg-zinc-900/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800/80">
                    <ProductImageBox
                      name={item.name}
                      image={item.image}
                      rarity={normalizeInventoryRarity(item.rarity)}
                      compact
                      imageFit="contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{item.name}</p>
                    <p className="truncate text-xs text-zinc-500">{productCategory(item.name)}</p>
                    <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] ${rarityToClassName(item.rarity)}`}>
                      {normalizeInventoryRarity(item.rarity)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03040a]/85 px-4 backdrop-blur-md"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fusion-confirm-title"
            className="w-full max-w-md rounded-2xl border border-fuchsia-500/35 bg-[#0b1020]/95 p-5 shadow-[0_0_48px_rgba(192,38,211,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="fusion-confirm-title" className="text-lg font-semibold text-zinc-100">
              Xác nhận dung hợp
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Cơ hội thành công: <strong className="text-fuchsia-300">{successPercent.toFixed(1)}%</strong>. Mục tiêu:{" "}
              <strong>{targetLabel}</strong>. Nếu thất bại, tất cả vật phẩm đã chọn sẽ mất.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-500"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={startFusionAfterConfirm}
                className="rounded-lg border border-fuchsia-500/70 bg-fuchsia-950/40 px-4 py-2.5 text-sm font-medium text-fuchsia-100 hover:bg-fuchsia-950/60"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <FusionAnimationModal
        open={fusionAnimOpen}
        snapshot={animSnapshot}
        normalizeRarity={normalizeInventoryRarity}
        rarityClass={rarityToClassName}
        rarityGlowStyle={rarityGlowStyle}
        onCommit={handleFusionCommit}
        onComplete={onFusionAnimationComplete}
      />

      {result && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03040a]/88 px-4 backdrop-blur-md"
          role="presentation"
          onClick={() => setResult(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-zinc-600 bg-[#0b1020]/96 p-5 text-center shadow-[0_0_60px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {result.ok && result.item ? (
              <>
                <p className="text-lg font-semibold text-emerald-300">Dung hợp thành công</p>
                <div className="mx-auto mt-4 max-w-[200px]">
                  <ProductImageBox
                    name={result.item.name}
                    image={result.item.image}
                    rarity={normalizeInventoryRarity(result.item.rarity)}
                  />
                </div>
                <h3 className="mt-3 text-xl font-bold text-zinc-50">{result.item.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{productCategory(result.item.name)}</p>
                <p className={`mt-3 inline-block rounded-full border px-3 py-1 text-sm ${rarityToClassName(result.item.rarity)}`}>
                  {normalizeInventoryRarity(result.item.rarity)}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold text-red-400">Dung hợp thất bại</p>
            )}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-6 w-full rounded-lg border border-zinc-500 bg-zinc-800/60 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
