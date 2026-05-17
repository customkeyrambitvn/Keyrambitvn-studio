"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CompactPageTitleBar } from "../components/CompactPageTitleBar";
import { CompactTopNav } from "../components/CompactTopNav";
import { FusionAnimationModal, type FusionAnimResult, type FusionAnimSnapshot } from "../components/FusionAnimationModal";
import { FusionChamber } from "../components/ceremony";
import { MotionButton } from "../components/motion";
import { StoreButton, StoreModal, StorePanel, StoreShell } from "../components/store";
import { ProductImageBox } from "../components/ProductImageBox";
import { useInventoryPersist } from "../hooks/useInventoryPersist";
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
import { INVENTORY_CHANGED_EVENT, readLocalInventory, type InventoryItem } from "../../lib/inventory-local";

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
  const { saveInventory } = useInventoryPersist();
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
    const refresh = () => setInventory(readLocalInventory());
    refresh();
    window.addEventListener(INVENTORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(INVENTORY_CHANGED_EVENT, refresh);
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
    const current = readLocalInventory();
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
    setInventory(readLocalInventory());
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
    <StoreShell contentClassName="app-page--compact min-h-[100dvh] flex flex-1 flex-col">
      <div className="app-page__chrome shrink-0">
        <CompactTopNav />
      </div>
      <div className="app-page__workspace">
        <CompactPageTitleBar
          kicker="Fusion lab"
          title="Dung Hợp"
          description="Ghép vật phẩm từ kho để thử độ hiếm cao hơn."
        />

        <div className="store-segment mb-4">
        <button
          type="button"
          onClick={() => setMode("normal")}
          className={`store-segment__btn${mode === "normal" ? " store-segment__btn--active" : ""}`}
        >
          Thường (tối đa 5)
        </button>
        <button
          type="button"
          onClick={() => setMode("high")}
          className={`store-segment__btn${mode === "high" ? " store-segment__btn--active" : ""}`}
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
                  className={`store-btn store-btn--sm ${normalRecipe === id ? "store-btn--primary" : "store-btn--secondary"}`}
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
                  className={`store-btn store-btn--sm ${rarityToClassName(t)} ${
                    highTarget === t ? "store-btn--primary" : "store-btn--secondary"
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

        <FusionChamber
          active={filledItems.length > 0}
          chancePercent={successPercent}
          targetLabel={targetLabel}
        >
          {validationError && filledItems.length > 0 && (
            <p className="mb-2 text-xs text-amber-400/90">{validationError}</p>
          )}

          <p className="mb-2 text-xs text-zinc-500">Ô dung hợp — bấm ô để trả vật phẩm ra</p>
          <div
            className={`grid gap-2 ${maxSlots <= 5 ? "grid-cols-5 sm:grid-cols-5" : "grid-cols-5 sm:grid-cols-5 md:grid-cols-10"}`}
          >
            {slots.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => s && clearSlot(i)}
                className={`store-slot sm:min-h-[5rem] ${s ? "store-slot--filled" : ""}`}
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
                  <span className="text-[10px] text-zinc-600 sm:text-xs">{i + 1}</span>
                )}
              </button>
            ))}
          </div>

          <MotionButton
            type="button"
            variant="action"
            disabled={!canFuse || !!validationError}
            onClick={openFuse}
            className="mt-5 w-full"
          >
            Dung Hợp
          </MotionButton>
        </FusionChamber>

        <StorePanel className="p-4">
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
                  className="store-panel store-panel--inset flex w-full items-center gap-3 p-3 text-left transition hover:border-[var(--store-border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="h-12 w-12 shrink-0 overflow-visible">
                    <ProductImageBox
                      name={item.name}
                      image={item.image}
                      rarity={normalizeInventoryRarity(item.rarity)}
                      compact
                      imageFit="contain"
                      frameless
                      auraPresentation="ritual"
                      idleMotion={false}
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
        </StorePanel>
      </div>

      <StoreModal open={confirmOpen} onClose={() => setConfirmOpen(false)} titleId="fusion-confirm-title">
        <p id="fusion-confirm-title" className="text-lg font-semibold text-zinc-100">
          Xác nhận dung hợp
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Cơ hội thành công: <strong className="text-[#f5e6b8]">{successPercent.toFixed(1)}%</strong>. Mục tiêu:{" "}
          <strong>{targetLabel}</strong>. Nếu thất bại, tất cả vật phẩm đã chọn sẽ mất.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <StoreButton type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
            Hủy
          </StoreButton>
          <StoreButton type="button" onClick={startFusionAfterConfirm}>
            Xác nhận
          </StoreButton>
        </div>
      </StoreModal>

      <FusionAnimationModal
        open={fusionAnimOpen}
        snapshot={animSnapshot}
        normalizeRarity={normalizeInventoryRarity}
        rarityClass={rarityToClassName}
        rarityGlowStyle={rarityGlowStyle}
        onCommit={handleFusionCommit}
        onComplete={onFusionAnimationComplete}
      />

      {result ? (
        <StoreModal open onClose={() => setResult(null)} size="sm" className="text-center">
          {result.ok && result.item ? (
              <>
                <p className="text-lg font-semibold text-emerald-300">Dung hợp thành công</p>
                <div className="mx-auto mt-4 max-w-[220px]">
                  <ProductImageBox
                    name={result.item.name}
                    image={result.item.image}
                    rarity={normalizeInventoryRarity(result.item.rarity)}
                    frameless
                    imageFit="contain"
                    auraPresentation="showcase"
                    interactiveAura
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
          <StoreButton type="button" variant="secondary" onClick={() => setResult(null)} className="mt-6 w-full">
            Đóng
          </StoreButton>
        </StoreModal>
      ) : null}
    </StoreShell>
  );
}
