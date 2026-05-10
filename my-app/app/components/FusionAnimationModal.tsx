"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ProductImageBox } from "./ProductImageBox";
import { useResolvedProductImage } from "./ProductImageContext";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

export type FusionAnimSnapshot = {
  items: InventoryItem[];
  maxSlots: number;
};

export type FusionAnimResult = { ok: boolean; item?: InventoryItem };

type Phase = "idle" | "slots" | "fly" | "forge" | "strike" | "success" | "fail";

type Props = {
  open: boolean;
  snapshot: FusionAnimSnapshot | null;
  normalizeRarity: (r: string) => string;
  rarityClass: (r: string) => string;
  rarityGlowStyle: (r: string) => CSSProperties;
  onCommit: () => FusionAnimResult;
  onComplete: (result: FusionAnimResult) => void;
};

function MiniThumb({
  item,
  rarityClass,
}: {
  item: InventoryItem;
  rarityClass: (r: string) => string;
}) {
  const resolved = useResolvedProductImage(item.name, item.image);
  return (
    <div
      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-600/80 bg-zinc-900/90 sm:h-16 sm:w-16 ${rarityClass(item.rarity)}`}
    >
      {resolved ? (
        <Image src={resolved} alt="" fill sizes="64px" className="object-contain p-1" />
      ) : (
        <div className="flex h-full items-center justify-center text-[8px] text-zinc-500">KR</div>
      )}
    </div>
  );
}

export function FusionAnimationModal({
  open,
  snapshot,
  normalizeRarity,
  rarityClass,
  rarityGlowStyle,
  onCommit,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<FusionAnimResult | null>(null);
  const timersRef = useRef<number[]>([]);
  const outcomeRef = useRef<FusionAnimResult | null>(null);
  const finishedRef = useRef(false);
  const sessionRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const q = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const finishOnce = (res: FusionAnimResult) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    onCompleteRef.current(res);
  };

  /* Timeline: slots → fly → forge → strike (commit) → success|fail → finish */
  useEffect(() => {
    if (!open || !snapshot || snapshot.items.length === 0) {
      clearTimers();
      setPhase("idle");
      setOutcome(null);
      outcomeRef.current = null;
      finishedRef.current = false;
      return;
    }

    sessionRef.current += 1;
    const sess = sessionRef.current;
    finishedRef.current = false;
    outcomeRef.current = null;
    setOutcome(null);
    setPhase("slots");
    clearTimers();

    q(() => {
      if (sessionRef.current !== sess) return;
      setPhase("fly");
    }, 400);
    q(() => {
      if (sessionRef.current !== sess) return;
      setPhase("forge");
    }, 1250);
    q(() => {
      if (sessionRef.current !== sess) return;
      setPhase("strike");
    }, 2050);

    return () => clearTimers();
  }, [open, snapshot]);

  /* On strike: commit fusion once */
  useEffect(() => {
    if (phase !== "strike" || !open) return;
    const res = onCommit();
    outcomeRef.current = res;
    setOutcome(res);
    const t = window.setTimeout(() => {
      setPhase(res.ok ? "success" : "fail");
    }, 480);
    timersRef.current.push(t);
    return () => {
      window.clearTimeout(t);
      timersRef.current = timersRef.current.filter((id) => id !== t);
    };
  }, [phase, open, onCommit]);

  /* After success/fail FX, close */
  useEffect(() => {
    if (phase !== "success" && phase !== "fail") return;
    const res = outcomeRef.current;
    if (!res) return;
    const ms = phase === "success" ? 2200 : 2400;
    const t = window.setTimeout(() => finishOnce(res), ms);
    timersRef.current.push(t);
    return () => {
      window.clearTimeout(t);
      timersRef.current = timersRef.current.filter((id) => id !== t);
    };
  }, [phase]);

  const skip = () => {
    const res = onCommit();
    outcomeRef.current = res;
    setOutcome(res);
    finishOnce(res);
  };

  if (!open || !snapshot || snapshot.items.length === 0) return null;

  const items = snapshot.items;
  const n = items.length;
  const flying = phase === "fly" || phase === "forge" || phase === "strike";
  const showCore = phase === "forge" || phase === "strike" || phase === "success" || phase === "fail";
  const hammerDown = phase === "strike" || phase === "success" || phase === "fail";
  const shake = phase === "strike";
  const successFx = phase === "success";
  const failFx = phase === "fail";

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#03040a]/92 px-4 backdrop-blur-md motion-reduce:transition-none ${shake ? "fusion-modal-shake" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Dung hợp"
    >
      {successFx && <div className="fusion-flash-overlay pointer-events-none" aria-hidden />}
      {successFx && <div className="fusion-sparkles pointer-events-none" aria-hidden />}

      <div className="relative mb-2 flex w-full max-w-lg flex-col items-center">
        <button
          type="button"
          onClick={skip}
          className="absolute -top-1 right-0 z-[80] rounded-lg border border-zinc-500/70 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-fuchsia-400/60 hover:text-white sm:text-sm"
        >
          Skip Dung Hợp
        </button>

        <p className="mb-3 mt-6 text-center text-xs uppercase tracking-[0.25em] text-fuchsia-300/90">Dung hợp</p>

        <div
          className={`relative z-10 mb-4 flex w-full flex-wrap justify-center gap-2 transition-opacity duration-500 ${
            flying ? "pointer-events-none opacity-20" : "opacity-100"
          }`}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex w-[4.5rem] flex-col items-center rounded-lg border border-zinc-600 bg-[#0d1222] p-1 sm:w-[5rem]"
            >
              <MiniThumb item={item} rarityClass={rarityClass} />
              <span className="mt-1 line-clamp-2 text-center text-[9px] text-zinc-400">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="relative h-[min(42vh,340px)] w-full max-w-md">
          {showCore && (
            <div
              className={`fusion-anvil absolute bottom-8 left-1/2 z-20 w-[min(88%,14rem)] -translate-x-1/2 transition-opacity duration-500 ${
                failFx ? "opacity-[0.35]" : "opacity-100"
              }`}
            >
              <div className="fusion-core-glow relative mx-auto h-16 rounded-lg bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950 shadow-[0_0_32px_rgba(167,139,250,0.35),inset_0_2px_0_rgba(255,255,255,0.12)] ring-2 ring-fuchsia-500/30 sm:h-[4.5rem]">
                {phase === "strike" && <span className="fusion-impact-burst" aria-hidden />}
                <div className="absolute inset-x-3 top-1 h-1 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.35em] text-fuchsia-200/80">
                  Core
                </span>
              </div>
              <div className="mx-auto mt-1 h-3 w-[108%] -translate-x-[4%] rounded-b-md bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-inner" />
            </div>
          )}

          {showCore && (
            <div className="fusion-hammer-mount pointer-events-none absolute bottom-[6.9rem] left-1/2 z-30 -translate-x-1/2 sm:bottom-[7.25rem]">
              <div
                className={`fusion-hammer-swing ${hammerDown ? "fusion-hammer-down" : "fusion-hammer-up"}`}
              >
                <div className="fusion-hammer-inner flex h-[5.5rem] w-[4.25rem] flex-col items-center justify-end sm:h-[6.25rem] sm:w-[5rem]">
                  <div className="fusion-hammer-head relative z-20 mb-0.5 shadow-lg ring-1 ring-amber-950/60" />
                  <div className="fusion-hammer-handle relative z-10" />
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-[25]">
            {items.map((item, i) => {
              const delay = i * 65;
              const flyActive =
                phase === "fly" || phase === "forge" || phase === "strike" || phase === "success";
              const pct = ((i + 0.5) / Math.max(n, 1)) * 100;
              return (
                <div
                  key={item.id}
                  className={`fusion-fly-chip absolute ${flyActive ? "fusion-fly-chip--center" : ""} ${
                    failFx ? "fusion-fly-chip--shatter" : ""
                  } ${successFx ? "fusion-fly-chip--success-pulse" : ""}`}
                  style={
                    {
                      left: `${pct}%`,
                      bottom: flyActive ? "46%" : "26%",
                      transform: flyActive ? "translate(-50%, 50%) scale(0.9)" : "translateX(-50%) scale(1)",
                      transitionProperty: "left, bottom, transform, opacity, filter",
                      transitionDuration: flyActive ? "880ms" : "480ms",
                      transitionTimingFunction: "cubic-bezier(0.34, 0.02, 0.22, 1)",
                      transitionDelay: `${delay}ms`,
                      ...(successFx && outcome?.ok && outcome.item ? rarityGlowStyle(outcome.item.rarity) : {}),
                    } as CSSProperties
                  }
                >
                  <MiniThumb item={item} rarityClass={rarityClass} />
                </div>
              );
            })}
          </div>

          {failFx && (
            <>
              <div className="fusion-smoke pointer-events-none" aria-hidden />
              <div className="fusion-crack-glow pointer-events-none" aria-hidden />
              <div className="fusion-red-flicker pointer-events-none" aria-hidden />
            </>
          )}

          {successFx && outcome?.ok && outcome.item && (
            <div
              className="fusion-reveal-enter relative z-40 mt-10 flex flex-col items-center opacity-0"
              style={rarityGlowStyle(outcome.item.rarity)}
            >
              <div className="w-44">
                <ProductImageBox
                  name={outcome.item.name}
                  image={outcome.item.image}
                  rarity={normalizeRarity(outcome.item.rarity)}
                />
              </div>
            </div>
          )}

          {failFx && (
            <p className="absolute bottom-0 left-1/2 z-50 w-full -translate-x-1/2 px-2 text-center text-lg font-bold text-red-400 drop-shadow-[0_0_14px_rgba(0,0,0,0.95)]">
              Dung hợp thất bại
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
