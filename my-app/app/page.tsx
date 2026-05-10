"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandHeaderBar } from "./components/BrandHeaderBar";
import { BrandWatermark } from "./components/BrandWatermark";
import { MainNavWithAuth } from "./components/MainNavWithAuth";
import { ProductImageBox } from "./components/ProductImageBox";
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

type BoxCard = {
  id: string;
  name: string;
  cost: number;
  flavor: string;
  glow: string;
};

const BOXES: BoxCard[] = [
  { id: "tier", name: "Tier Keyrambit Box", cost: 125000, flavor: "Hộp Keyrambit Tier tổng hợp", glow: "from-cyan-400/60 to-blue-700/40" },
  { id: "peak", name: "Peak KeyrambitBox", cost: 129000, flavor: "Hộp Keyrambit nhân vật PEAK", glow: "from-indigo-400/60 to-purple-700/40" },
  { id: "multiverse", name: "Multiverse Keyrambit Box", cost: 99000, flavor: "Hộp Keyrambit nhân vật Multiverse", glow: "from-fuchsia-400/60 to-violet-700/40" },
  { id: "mecha", name: "Mecha Keyrambit Box", cost: 100000, flavor: "Hộp Keyrambit Mecha", glow: "from-amber-300/60 to-orange-700/40" },
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

const FLASH_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: 22 + ((i * 37) % 56),
  top: 28 + ((i * 29) % 40),
  px: ((i % 6) - 2.5) * 42 + (i % 2) * 8,
  py: ((i % 5) - 2) * 38 - (i % 3) * 6,
  delay: i * 0.018,
}));

const LASER_SPARK_COUNT = 12;

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

function flashColors(rarity: Rarity): { core: string; ring: string; ambient: string } {
  switch (rarity) {
    case "Thường":
      return {
        core: "rgba(241, 245, 249, 0.94)",
        ring: "rgba(255, 255, 255, 0.8)",
        ambient: "rgba(148, 163, 184, 0.45)",
      };
    case "Hiếm":
      return {
        core: "rgba(56, 189, 248, 0.92)",
        ring: "rgba(96, 165, 250, 0.82)",
        ambient: "rgba(14, 165, 233, 0.48)",
      };
    case "Siêu Hiếm":
      return {
        core: "rgba(168, 85, 247, 0.92)",
        ring: "rgba(192, 132, 252, 0.78)",
        ambient: "rgba(126, 34, 206, 0.42)",
      };
    case "Combo":
      return {
        core: "rgba(52, 211, 153, 0.9)",
        ring: "rgba(74, 222, 128, 0.72)",
        ambient: "rgba(16, 185, 129, 0.4)",
      };
    case "Săn Lùng":
      return {
        core: "rgba(251, 146, 60, 0.92)",
        ring: "rgba(251, 191, 36, 0.75)",
        ambient: "rgba(234, 88, 12, 0.4)",
      };
    case "Secret":
      return {
        core: "rgba(248, 113, 113, 0.93)",
        ring: "rgba(239, 68, 68, 0.8)",
        ambient: "rgba(185, 28, 28, 0.45)",
      };
    case "Rare Secret":
      return {
        core: "rgba(244, 114, 182, 0.92)",
        ring: "rgba(217, 70, 239, 0.78)",
        ambient: "rgba(192, 38, 211, 0.4)",
      };
    case "Super Secret":
      return {
        core: "rgba(253, 224, 71, 0.95)",
        ring: "rgba(250, 204, 21, 0.88)",
        ambient: "rgba(234, 179, 8, 0.48)",
      };
  }
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
  const { saveInventory } = useInventoryPersist();
  const [activeBox, setActiveBox] = useState<BoxCard | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase | null>(null);
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);
  const [revealedItem, setRevealedItem] = useState<InventoryItem | null>(null);
  const [tearProgress, setTearProgress] = useState(0);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [isTearPointerDown, setIsTearPointerDown] = useState(false);

  const tearStripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const flashStartedRef = useRef(false);

  useEffect(() => {
    if (!showAbandonConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAbandonConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAbandonConfirm]);

  useEffect(() => {
    if (openingPhase !== "flash") return;
    const item = pendingItem;
    const tid = window.setTimeout(() => {
      if (item) setRevealedItem(item);
      setOpeningPhase("revealed");
    }, 1500);
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

  const flashStyle = useMemo(() => {
    if (!pendingItem) return flashColors("Thường");
    return flashColors(pendingItem.rarity);
  }, [pendingItem]);

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
    const rolled = openBlindBox(box.name);
    setPendingItem(rolled);
    setOpeningPhase("pouch-ready");
    setIsOpening(true);
  };

  const closeReveal = () => {
    setIsOpening(false);
    setOpeningPhase(null);
    setActiveBox(null);
    setPendingItem(null);
    setRevealedItem(null);
    setTearProgress(0);
    setShowAbandonConfirm(false);
    flashStartedRef.current = false;
    draggingRef.current = false;
    setIsTearPointerDown(false);
  };

  const addToInventory = () => {
    if (!revealedItem) return;
    const current = readLocalInventory();
    const next = [revealedItem, ...current];
    saveInventory(next);
    closeReveal();
  };

  const confirmAbandonReveal = () => {
    setShowAbandonConfirm(false);
    closeReveal();
  };

  const showPouchPack =
    !!pendingItem &&
    (openingPhase === "pouch-ready" || openingPhase === "pouch-tearing" || openingPhase === "flash");
  const showTearInstructions = openingPhase === "pouch-ready" || openingPhase === "pouch-tearing";

  const p = tearProgress;
  const stripFlyOff = openingPhase === "flash";
  const laserActive = isTearPointerDown || openingPhase === "pouch-tearing";

  return (
    <main className="relative min-h-screen bg-[#06070f] text-zinc-100">
      <BrandWatermark />
      <div className="relative z-10 mx-auto min-h-screen w-full px-4 py-5 sm:px-6">
        <BrandHeaderBar />
        <MainNavWithAuth />
        <header className="mb-5 rounded-2xl border border-cyan-500/30 bg-[#0b1020]/85 p-4 shadow-[0_0_40px_rgba(0,170,255,0.1)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Keyrambit Inventory</p>
          <h1 className="mt-2 text-2xl font-semibold">Keyrambitvn Store</h1>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BOXES.map((box) => (
            <article
              key={box.id}
              className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${box.glow} p-[1px]`}
            >
              <div className="rounded-2xl bg-[#0a0f1d] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Blind Box</p>
                <h2 className="mt-2 text-lg font-semibold">{box.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{box.flavor}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-cyan-300">{box.cost} VND</span>
                  <button
                    type="button"
                    onClick={() => handleOpen(box)}
                    disabled={isOpening}
                    className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mở Hộp
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>

      {isOpening && openingPhase && (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-[#03040a]/93 px-4 backdrop-blur-[3px]">
          <div className="relative w-full max-w-sm overflow-visible rounded-2xl border border-cyan-500/35 bg-[#090d1a]/96 p-4 text-center shadow-[0_0_60px_rgba(0,180,255,0.18)] backdrop-blur-md sm:p-5">
            {showPouchPack && (
              <div className="py-3">
                {showTearInstructions && (
                  <>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Túi bạc niêm phong</p>
                    <p className="mt-1 text-xs text-zinc-500">{activeBox?.name}</p>
                    <p className="mt-4 text-sm font-medium text-zinc-200">Kéo ngang qua vạch nét đứt để xé túi</p>
                  </>
                )}
                {openingPhase === "flash" && <p className="mt-2 text-xs text-zinc-500">Đang mở...</p>}

                <div className={`foil-pouch-scene mx-auto ${showTearInstructions ? "mt-5" : "mt-2"}`}>
                  <div className="foil-pouch-perspective">
                    <div className="foil-pouch-tilt">
                      <div className="foil-pouch-inner">
                        <div className={`foil-bag ${stripFlyOff ? "foil-bag--split" : ""}`}>
                          <div className="foil-crinkle" aria-hidden />
                          <div className="foil-shine-sweep" aria-hidden />
                          <div className="foil-seal foil-seal--left" aria-hidden />
                          <div className="foil-seal foil-seal--right" aria-hidden />
                          <div className="foil-seal foil-seal--bottom" aria-hidden />
                          <div className="foil-notch foil-notch--l" aria-hidden />
                          <div className="foil-notch foil-notch--r" aria-hidden />
                          <div className="foil-tear-track" aria-hidden>
                            <div className={`foil-tear-dash ${laserActive ? "foil-tear-dash--hot" : ""}`} />
                          </div>
                          <div className="foil-panel foil-panel--upper" />
                          <div className="foil-panel foil-panel--lower">
                            <span className="foil-brand-micro">KEYRAMBIT</span>
                          </div>
                        </div>

                        <div className="laser-cut-layer laser-cut-layer--foil" aria-hidden>
                          <div className={`laser-cut-guide ${laserActive ? "laser-cut-guide--active" : ""}`} />
                          <div className="laser-cut-opened" style={{ width: `${Math.min(100, p * 100)}%` }} />
                          <div className="laser-cut-edge" style={{ left: `${Math.min(99.5, Math.max(0, p * 100))}%` }} />
                          <div
                            className="laser-cut-head"
                            style={{
                              left: `${Math.min(100, Math.max(0, p * 100))}%`,
                              opacity: p < 0.02 ? 0 : 0.85 + p * 0.15,
                            }}
                          />
                          {Array.from({ length: LASER_SPARK_COUNT }, (_, i) => {
                            if (p * LASER_SPARK_COUNT < i) return null;
                            return (
                              <span
                                key={`lz-${i}`}
                                className="laser-spark"
                                style={{
                                  left: `${((i + 0.5) / LASER_SPARK_COUNT) * Math.min(100, p * 100)}%`,
                                }}
                              />
                            );
                          })}
                        </div>

                        <div
                          ref={tearStripRef}
                          className={`laser-cut-hit laser-cut-hit--foil ${isTearPointerDown ? "laser-cut-hit--dragging" : ""} ${openingPhase === "flash" ? "laser-cut-hit--blocked" : ""}`}
                          style={{ touchAction: "none" }}
                          onPointerDown={onTearPointerDown}
                          onPointerMove={onTearPointerMove}
                          onPointerUp={endTearPointer}
                          onPointerCancel={endTearPointer}
                        >
                          <div className="laser-cut-hit-rail">
                            <div className="laser-cut-hit-fill" style={{ width: `${Math.min(100, p * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {showTearInstructions && (
                  <div className="mx-auto mt-4 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-cyan-500/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-300 transition-[width] duration-100"
                      style={{ width: `${Math.min(100, tearProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {openingPhase === "flash" && !showPouchPack && <div className="py-20" aria-hidden />}

            {openingPhase === "revealed" && revealedItem && (
              <div className={`space-y-3 overflow-visible rounded-xl border border-zinc-700 bg-[#0d1222] p-4 ${rarityClass}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">New Keyrambit Unlocked</p>
                <ProductImageBox
                  className="mx-auto max-w-[280px]"
                  name={revealedItem.name}
                  image={revealedItem.image}
                  rarity={revealedItem.rarity}
                />
                <h3 className="text-2xl font-bold">{revealedItem.name}</h3>
                <p className="text-sm text-zinc-400">{productCategory(revealedItem.name)}</p>
                <p className={`inline-block rounded-full border px-3 py-1 text-sm ${rarityClass}`}>{revealedItem.rarity}</p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={addToInventory}
                    className="w-full rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    Thêm vào kho đồ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAbandonConfirm(true)}
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900/40 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900/70"
                  >
                    Từ bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {isOpening && openingPhase === "flash" && pendingItem && (
        <div
          className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center overflow-hidden bg-[#03040a]/65 backdrop-blur-sm"
          aria-hidden
        >
          <div
            className="reveal-flash-layer absolute h-[140%] w-[140%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${flashStyle.core} 0%, ${flashStyle.ring} 35%, ${flashStyle.ambient} 55%, transparent 70%)`,
              boxShadow: `0 0 120px 60px ${flashStyle.ambient}, inset 0 0 80px ${flashStyle.ring}`,
            }}
          />
          {FLASH_PARTICLES.map((pt, i) => (
            <span
              key={i}
              className="reveal-flash-particle"
              style={
                {
                  left: `${pt.left}%`,
                  top: `${pt.top}%`,
                  backgroundColor: flashStyle.core,
                  ["--px" as string]: `${pt.px}px`,
                  ["--py" as string]: `${pt.py}px`,
                  animationDelay: `${pt.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {isOpening && revealedItem && showAbandonConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03040a]/80 px-4 backdrop-blur-md"
          onClick={() => setShowAbandonConfirm(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="abandon-reveal-title"
            className="w-full max-w-md rounded-2xl border border-zinc-600/60 bg-[#0b1020]/95 p-5 shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="abandon-reveal-title" className="text-sm leading-relaxed text-zinc-200">
              Bạn có chắc muốn từ bỏ vật phẩm này không? Vật phẩm sẽ không được thêm vào kho đồ.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAbandonConfirm(false)}
                className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/80"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmAbandonReveal}
                className="rounded-lg border border-red-500/75 bg-red-950/45 px-4 py-2.5 text-sm font-medium text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.35)] transition hover:border-red-400 hover:bg-red-950/65 hover:shadow-[0_0_28px_rgba(239,68,68,0.5)]"
              >
                Xác nhận từ bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
