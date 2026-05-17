"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CompactPageTitleBar } from "./components/CompactPageTitleBar";
import { CompactTopNav } from "./components/CompactTopNav";
import { MetallicPouch, RarityFlash, RevealStage } from "./components/ceremony";
import { MotionButton, RevealCard, rarityToFloatMod } from "./components/motion";
import { useSfx } from "./contexts/SfxContext";
import { CollectibleCard, StoreButton, StoreShell, StoreToast } from "./components/store";
import { useInventoryPersist } from "./hooks/useInventoryPersist";
import { ITEMS_BY_RARITY } from "./data/products";
import { productCategory } from "./lib/category";
import { readLocalInventory } from "../lib/inventory-local";

type Rarity = "Thường" | "Hiếm" | "Siêu Hiếm" | "Combo" | "Săn Lùng" | "Secret" | "Rare Secret" | "Super Secret";

type OpeningPhase = "pouch-ready" | "pouch-tearing" | "flash" | "revealed";

type InventoryItem = {
  id: string;
  name: string;
  rarity: Rarity;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

type BoxAccent = "tier" | "peak" | "multiverse" | "mecha";

type BoxCard = {
  id: string;
  name: string;
  cost: number;
  flavor: string;
  accent: BoxAccent;
};

const BOXES: BoxCard[] = [
  { id: "tier", name: "Tier Keyrambit Box", cost: 125000, flavor: "Hộp Keyrambit Tier tổng hợp", accent: "tier" },
  { id: "peak", name: "Peak KeyrambitBox", cost: 129000, flavor: "Hộp Keyrambit nhân vật PEAK", accent: "peak" },
  { id: "multiverse", name: "Multiverse Keyrambit Box", cost: 99000, flavor: "Hộp Keyrambit nhân vật Multiverse", accent: "multiverse" },
  { id: "mecha", name: "Mecha Keyrambit Box", cost: 100000, flavor: "Hộp Keyrambit Mecha", accent: "mecha" },
];

const RARITY_WEIGHTS: Array<{ rarity: Rarity; weight: number }> = [
  { rarity: "Thường", weight: 40 },
  { rarity: "Hiếm", weight: 32 },
  { rarity: "Siêu Hiếm", weight: 14 },
  { rarity: "Combo", weight: 0 },
  { rarity: "Săn Lùng", weight: 6 },
  { rarity: "Secret", weight: 2 },
  { rarity: "Rare Secret", weight: 4 },
  { rarity: "Super Secret", weight: 2 },
];

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

function rollRarity(): Rarity {
  const active = RARITY_WEIGHTS.filter((bucket) => ITEMS_BY_RARITY[bucket.rarity].length > 0);
  const total = active.reduce((sum, bucket) => sum + bucket.weight, 0);
  if (total <= 0 || active.length === 0) {
    return "Thường";
  }
  const roll = Math.random() * total;
  let cursor = 0;
  for (const bucket of active) {
    cursor += bucket.weight;
    if (roll <= cursor) {
      return bucket.rarity;
    }
  }
  return active[0].rarity;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function openBlindBox(boxName: string): InventoryItem {
  const rarity = rollRarity();
  const product = pickRandom(ITEMS_BY_RARITY[rarity]);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rarity,
    name: product.name,
    ...(product.image ? { image: product.image } : {}),
    boxName,
    acquiredAt: new Date().toISOString(),
  };
}

export default function Home() {
  const router = useRouter();
  const { playClick, playBoxOpen, playBoxFlash, playBoxRevealFinishOnly, playToast, playModalClose } = useSfx();
  const { saveInventory } = useInventoryPersist();
  const [activeBox, setActiveBox] = useState<BoxCard | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase | null>(null);
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);
  const [revealedItem, setRevealedItem] = useState<InventoryItem | null>(null);
  const [tearProgress, setTearProgress] = useState(0);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [isTearPointerDown, setIsTearPointerDown] = useState(false);
  const [itemSavedToInventory, setItemSavedToInventory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tearStripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const flashStartedRef = useRef(false);
  const savedRevealItemIdRef = useRef<string | null>(null);
  const revealEnterPlayedForIdRef = useRef<string | null>(null);
  const lastOpeningSfxRef = useRef<OpeningPhase | null>(null);

  useEffect(() => {
    if (!showAbandonConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAbandonConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAbandonConfirm]);

  useEffect(() => {
    if (!toastMessage) return;
    const tid = window.setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(tid);
  }, [toastMessage]);

  useEffect(() => {
    if (openingPhase !== "flash") return;
    const item = pendingItem;
    const tid = window.setTimeout(() => {
      if (item) setRevealedItem(item);
      setOpeningPhase("revealed");
    }, 2100);
    return () => clearTimeout(tid);
  }, [openingPhase, pendingItem]);

  useEffect(() => {
    if (!isTearPointerDown || (openingPhase !== "pouch-ready" && openingPhase !== "pouch-tearing")) return;
    const id = window.setInterval(() => {
      setTearProgress((prev) => {
        const next = Math.min(1, prev + 0.022);
        if (next >= 0.8 && !flashStartedRef.current) {
          flashStartedRef.current = true;
          queueMicrotask(() => setOpeningPhase("flash"));
        }
        return next;
      });
    }, 72);
    return () => clearInterval(id);
  }, [isTearPointerDown, openingPhase]);

  const rarityClass = useMemo(() => {
    if (!revealedItem) return "";
    return rarityToClassName(revealedItem.rarity);
  }, [revealedItem]);

  const tryTriggerFlash = (nextProgress: number) => {
    if (nextProgress >= 0.8 && !flashStartedRef.current) {
      flashStartedRef.current = true;
      queueMicrotask(() => setOpeningPhase("flash"));
    }
  };

  const updateTearFromClientX = (clientX: number) => {
    if (openingPhase === "flash") return;
    const el = tearStripRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setTearProgress((prev) => {
      const next = Math.max(prev, p);
      tryTriggerFlash(next);
      return next;
    });
  };

  const onTearPointerDown = (e: React.PointerEvent) => {
    if (openingPhase === "flash") return;
    if (openingPhase !== "pouch-ready" && openingPhase !== "pouch-tearing") return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsTearPointerDown(true);
    setOpeningPhase("pouch-tearing");
    playClick("center", 0.7);
    updateTearFromClientX(e.clientX);
  };

  const onTearPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateTearFromClientX(e.clientX);
  };

  const endTearPointer = (e: React.PointerEvent) => {
    draggingRef.current = false;
    setIsTearPointerDown(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleOpen = (box: BoxCard) => {
    if (isOpening) return;
    flashStartedRef.current = false;
    draggingRef.current = false;
    setIsTearPointerDown(false);
    setTearProgress(0);
    setActiveBox(box);
    setRevealedItem(null);
    setShowAbandonConfirm(false);
    setItemSavedToInventory(false);
    savedRevealItemIdRef.current = null;
    revealEnterPlayedForIdRef.current = null;
    const rolled = openBlindBox(box.name);
    setPendingItem(rolled);
    lastOpeningSfxRef.current = null;
    setOpeningPhase("pouch-ready");
    setIsOpening(true);
    playBoxOpen(1);
  };

  const closeReveal = () => {
    setIsOpening(false);
    setOpeningPhase(null);
    setActiveBox(null);
    setPendingItem(null);
    setRevealedItem(null);
    setTearProgress(0);
    setShowAbandonConfirm(false);
    setItemSavedToInventory(false);
    savedRevealItemIdRef.current = null;
    flashStartedRef.current = false;
    draggingRef.current = false;
    setIsTearPointerDown(false);
  };

  const showInventoryToast = useCallback(() => {
    setToastMessage("Đã thêm vào kho đồ");
    playToast();
  }, [playToast]);

  const saveRevealedToInventory = useCallback((): boolean => {
    if (!revealedItem) return false;
    if (savedRevealItemIdRef.current === revealedItem.id) {
      setItemSavedToInventory(true);
      return true;
    }
    const current = readLocalInventory();
    if (current.some((entry) => entry.id === revealedItem.id)) {
      savedRevealItemIdRef.current = revealedItem.id;
      setItemSavedToInventory(true);
      return true;
    }
    saveInventory([revealedItem, ...current]);
    savedRevealItemIdRef.current = revealedItem.id;
    setItemSavedToInventory(true);
    return true;
  }, [revealedItem, saveInventory]);

  const handleAddAndOpenAnother = () => {
    if (!saveRevealedToInventory()) return;
    showInventoryToast();
    const box = activeBox;
    closeReveal();
    if (box) {
      window.setTimeout(() => handleOpen(box), 80);
    }
  };

  const handleViewInventory = () => {
    if (!saveRevealedToInventory()) return;
    showInventoryToast();
    router.push("/inventory");
  };

  const confirmAbandonReveal = () => {
    playModalClose();
    setShowAbandonConfirm(false);
    closeReveal();
  };

  const playRevealEnterAnimation =
    !!revealedItem && revealEnterPlayedForIdRef.current !== revealedItem.id;

  useEffect(() => {
    if (openingPhase === "revealed" && revealedItem) {
      revealEnterPlayedForIdRef.current = revealedItem.id;
    }
  }, [openingPhase, revealedItem]);

  useEffect(() => {
    if (!openingPhase || openingPhase === lastOpeningSfxRef.current) return;
    if (openingPhase === "flash") playBoxFlash(1);
    if (openingPhase === "revealed" && revealedItem) {
      playBoxRevealFinishOnly(revealedItem.rarity, 0.95);
    }
    lastOpeningSfxRef.current = openingPhase;
  }, [openingPhase, revealedItem, playBoxFlash, playBoxRevealFinishOnly]);



  const showPouchPack =
    !!pendingItem &&
    (openingPhase === "pouch-ready" || openingPhase === "pouch-tearing" || openingPhase === "flash");
  const stripFlyOff = openingPhase === "flash";
  const laserActive = isTearPointerDown || openingPhase === "pouch-tearing";

  const openingRarityMod = rarityToFloatMod(pendingItem?.rarity ?? revealedItem?.rarity);

  return (
    <>
      <StoreShell contentClassName="app-page--compact min-h-[100dvh] flex flex-col">
        <div className="app-page__chrome shrink-0">
          <CompactTopNav />
        </div>
        <div className="app-page__workspace">
          <CompactPageTitleBar
            kicker="Blind box floor"
            title="Keyrambitvn Store"
            description="Chọn hộp, xé túi niêm phong, và đưa Keyrambit mới vào kho đồ của bạn."
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {BOXES.map((box) => (
            <CollectibleCard key={box.id} accent={box.accent} className="flex flex-col p-4 pl-5">
              <p className="store-kicker text-[0.6rem] tracking-[0.22em]">Blind box</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">{box.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{box.flavor}</p>
              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <span className="font-mono text-sm tabular-nums text-[#f5e6b8]">
                  {box.cost.toLocaleString("vi-VN")} <span className="text-zinc-500">VND</span>
                </span>
                <MotionButton type="button" variant="action" onClick={() => handleOpen(box)} disabled={isOpening} className="shrink-0">
                  Mở hộp
                </MotionButton>
              </div>
            </CollectibleCard>
          ))}
          </section>
        </div>
      </StoreShell>

      {isOpening && openingPhase && (
        <RevealStage phase={openingPhase} rarityMod={openingRarityMod}>
          {openingPhase === "revealed" && revealedItem ? (
            <RevealCard
              name={revealedItem.name}
              image={revealedItem.image}
              rarity={revealedItem.rarity}
              rarityClass={rarityClass}
              categoryLabel={productCategory(revealedItem.name)}
              playEnterAnimation={playRevealEnterAnimation}
              onAddAndOpenAnother={activeBox ? handleAddAndOpenAnother : undefined}
              onViewInventory={handleViewInventory}
              onAbandon={() => setShowAbandonConfirm(true)}
            />
          ) : showPouchPack && pendingItem ? (
            <MetallicPouch
              phase={openingPhase === "flash" ? "flash" : openingPhase === "pouch-tearing" ? "pouch-tearing" : "pouch-ready"}
              tearProgress={tearProgress}
              stripFlyOff={stripFlyOff}
              laserActive={laserActive}
              isPointerDown={isTearPointerDown}
              rarity={pendingItem.rarity}
              boxName={activeBox?.name}
              itemName={pendingItem.name}
              itemImage={pendingItem.image}
              tearStripRef={tearStripRef}
              onTearPointerDown={onTearPointerDown}
              onTearPointerMove={onTearPointerMove}
              onTearPointerUp={endTearPointer}
              onTearPointerCancel={endTearPointer}
            />
          ) : null}
        </RevealStage>
      )}

      {isOpening && openingPhase === "flash" && pendingItem && (
        <RarityFlash rarity={pendingItem.rarity} showSilhouette={false} />
      )}

      <StoreToast message={toastMessage} />

      {isOpening && revealedItem && showAbandonConfirm && (
        <div
          className="store-modal-backdrop z-[60]"
          onClick={() => {
            playModalClose();
            setShowAbandonConfirm(false);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="abandon-reveal-title"
            className="store-modal w-full max-w-md border-red-950/50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="store-kicker text-red-400/90">Cảnh báo</p>
            <p id="abandon-reveal-title" className="mt-2 text-sm leading-relaxed text-zinc-200">
              Bạn chắc chắn muốn từ bỏ vật phẩm này? Vật phẩm sẽ không được thêm vào kho.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <StoreButton
                type="button"
                variant="secondary"
                onClick={() => {
                  playModalClose();
                  setShowAbandonConfirm(false);
                }}
              >
                Hủy
              </StoreButton>
              <StoreButton type="button" variant="danger" onClick={confirmAbandonReveal}>
                Từ bỏ vật phẩm
              </StoreButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
