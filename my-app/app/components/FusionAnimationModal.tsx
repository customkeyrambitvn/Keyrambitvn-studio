"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSfx } from "@/app/contexts/SfxContext";
import { FusionRitualStage } from "./ceremony/FusionRitualStage";

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
  const { play } = useSfx();
  const lastSfxPhaseRef = useRef<Phase>("idle");

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
    }, 520);
    q(() => {
      if (sessionRef.current !== sess) return;
      setPhase("forge");
    }, 1400);
    q(() => {
      if (sessionRef.current !== sess) return;
      setPhase("strike");
    }, 2300);

    return () => clearTimers();
  }, [open, snapshot]);

  useEffect(() => {
    if (phase !== "strike" || !open) return;
    const res = onCommit();
    outcomeRef.current = res;
    setOutcome(res);
    const t = window.setTimeout(() => {
      setPhase(res.ok ? "success" : "fail");
    }, 520);
    timersRef.current.push(t);
    return () => {
      window.clearTimeout(t);
      timersRef.current = timersRef.current.filter((id) => id !== t);
    };
  }, [phase, open, onCommit]);

  useEffect(() => {
    if (phase !== "success" && phase !== "fail") return;
    const res = outcomeRef.current;
    if (!res) return;
    const ms = phase === "success" ? 2600 : 2400;
    const t = window.setTimeout(() => finishOnce(res), ms);
    timersRef.current.push(t);
    return () => {
      window.clearTimeout(t);
      timersRef.current = timersRef.current.filter((id) => id !== t);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === lastSfxPhaseRef.current) return;
    if (phase === "slots" && open) play("fusion_start");
    if (phase === "success") play("fusion_success");
    if (phase === "fail") play("fusion_fail");
    lastSfxPhaseRef.current = phase;
  }, [phase, open, play]);

  const skip = () => {
    const res = onCommit();
    outcomeRef.current = res;
    setOutcome(res);
    finishOnce(res);
  };

  if (!open || !snapshot || snapshot.items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <FusionRitualStage
        phase={phase}
        items={snapshot.items}
        normalizeRarity={normalizeRarity}
        rarityClass={rarityClass}
        rarityGlowStyle={rarityGlowStyle}
        outcomeItem={outcome?.ok ? outcome.item : undefined}
        onSkip={skip}
      />
    </div>
  );
}
