"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PackingKonvaStage } from "../packing/PackingKonvaStage";
import { PACKING_EDITOR_PRESETS } from "./packing-editor-presets";
import { PackingCropPanel } from "./PackingCropPanel";
import {
  PACKING_LAYOUT_DEFAULT_URL,
  PACKING_LAYOUT_LOCALSTORAGE_KEY,
  PACKING_LAYOUT_SAVED_EVENT,
  PACKING_TILT_MAX,
  PACKING_TILT_MIN,
  clampPackingTilt,
  parsePackingLayout,
  sortAssetsByZIndex,
  type PackingLayout,
  type PackingLayoutAsset,
} from "@/lib/packing-layout";
import { packingInventoryDefaults } from "@/lib/packing-warehouse";

const MAX_UNDO = 80;

/** `crypto.randomUUID` is missing or throws outside a secure context (e.g. http://LAN:3000 on some browsers). */
function newPackingAssetId(): string {
  try {
    const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

type HistoryState = {
  past: PackingLayout[];
  present: PackingLayout | null;
  future: PackingLayout[];
};

function bringForward(layout: PackingLayout, id: string): PackingLayout {
  const sorted = sortAssetsByZIndex(layout.assets);
  const i = sorted.findIndex((a) => a.id === id);
  if (i < 0 || i >= sorted.length - 1) return layout;
  const order = [...sorted];
  [order[i], order[i + 1]] = [order[i + 1], order[i]];
  return { ...layout, assets: order.map((a, idx) => ({ ...a, zIndex: idx * 10 })) };
}

function sendBackward(layout: PackingLayout, id: string): PackingLayout {
  const sorted = sortAssetsByZIndex(layout.assets);
  const i = sorted.findIndex((a) => a.id === id);
  if (i <= 0) return layout;
  const order = [...sorted];
  [order[i - 1], order[i]] = [order[i], order[i - 1]];
  return { ...layout, assets: order.map((a, idx) => ({ ...a, zIndex: idx * 10 })) };
}

function addPreset(
  layout: PackingLayout,
  preset: (typeof PACKING_EDITOR_PRESETS)[number],
  newId: string,
): PackingLayout {
  const maxZ = layout.assets.reduce((m, a) => Math.max(m, a.zIndex), -10);
  const w = preset.defaultWidth;
  const h = preset.defaultHeight;
  const i = layout.assets.length;
  const stagger = (i % 8) * 28;
  const cx = (layout.stage.width - w) / 2;
  const cy = (layout.stage.height - h) / 2;
  const x = Math.max(0, Math.min(layout.stage.width - w, cx + stagger));
  const y = Math.max(0, Math.min(layout.stage.height - h, cy + stagger));
  return {
    ...layout,
    assets: [
      ...layout.assets,
      {
        id: newId,
        src: preset.src,
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        tiltX: 0,
        tiltY: 0,
        zIndex: maxZ + 10,
        opacity: 1,
        locked: false,
      },
    ],
  };
}

export default function PackingEditorClient() {
  const [hist, setHist] = useState<HistoryState>({ past: [], present: null, future: [] });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Canvas crop tool: drag image = pan crop, handles = zoom crop (not resize frame). */
  const [canvasCropMode, setCanvasCropMode] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const layout = hist.present;
  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;

  const resetHistory = useCallback((present: PackingLayout) => {
    setHist({ past: [], present, future: [] });
  }, []);

  const withHistory = useCallback((updater: (l: PackingLayout) => PackingLayout) => {
    setHist((h) => {
      if (!h.present) return h;
      const next = updater(h.present);
      if (next === h.present) return h;
      return {
        past: [...h.past.slice(-(MAX_UNDO - 1)), h.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHist((h) => {
      if (h.past.length === 0 || !h.present) return h;
      const prev = h.past[h.past.length - 1]!;
      return {
        past: h.past.slice(0, -1),
        present: prev,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHist((h) => {
      if (h.future.length === 0 || !h.present) return h;
      const nxt = h.future[0]!;
      return {
        past: [...h.past, h.present],
        present: nxt,
        future: h.future.slice(1),
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(PACKING_LAYOUT_DEFAULT_URL)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const p = parsePackingLayout(json);
        if (!p) throw new Error("invalid");
        resetHistory(p);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load default layout.");
      });
    return () => {
      cancelled = true;
    };
  }, [resetHistory]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(0, Math.floor(r.width)), h: Math.max(0, Math.floor(r.height)) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: Math.max(0, Math.floor(r.width)), h: Math.max(0, Math.floor(r.height)) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!layout || !selectedId) return;
    if (!layout.assets.some((a) => a.id === selectedId)) setSelectedId(null);
  }, [layout, selectedId]);

  useEffect(() => {
    const sel = layout?.assets.find((a) => a.id === selectedId);
    if (!sel || sel.locked) setCanvasCropMode(false);
  }, [layout, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setCanvasCropMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cropEditAssetId =
    canvasCropMode && selectedId && layout?.assets.find((a) => a.id === selectedId && !a.locked)
      ? selectedId
      : null;

  const selected = layout?.assets.find((a) => a.id === selectedId) ?? null;

  const layersTopFirst = useMemo(() => {
    if (!layout) return [];
    return [...layout.assets].sort((a, b) => b.zIndex - a.zIndex);
  }, [layout]);

  const patchAsset = useCallback(
    (id: string, patch: Partial<PackingLayoutAsset>) => {
      withHistory((l) => ({
        ...l,
        assets: l.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
    },
    [withHistory],
  );

  useEffect(() => {
    if (!layout || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (inField) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (inField) return;
        e.preventDefault();
        redo();
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (inField) return;
      const a = layout.assets.find((x) => x.id === selectedId);
      if (!a || a.locked) return;
      e.preventDefault();
      withHistory((l) => ({ ...l, assets: l.assets.filter((x) => x.id !== selectedId) }));
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, selectedId, undo, redo, withHistory]);

  const saveJson = useCallback(async () => {
    if (!layout) return;
    const text = JSON.stringify(layout, null, 2);
    try {
      localStorage.setItem(PACKING_LAYOUT_LOCALSTORAGE_KEY, text);
      window.dispatchEvent(new Event(PACKING_LAYOUT_SAVED_EVENT));
    } catch (e) {
      console.warn("Could not save layout to localStorage (preview /packing)", e);
    }

    try {
      const r = await fetch("/api/packing-layout-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        window.alert(
          `Đã lưu localStorage + tải file.\n\nGhi layout mặc định (packing-default.json) thất bại: ${j.error ?? r.statusText}`,
        );
      } else {
        console.info("[packing-editor] Đã ghi public/layouts/packing-default.json");
      }
    } catch (e) {
      window.alert(
        `Đã lưu localStorage + tải file.\n\nKhông gọi được API ghi mặc định: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "packing-layout.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [layout]);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const p = parsePackingLayout(json);
        if (!p) {
          window.alert("Invalid layout JSON.");
          return;
        }
        resetHistory(p);
        setSelectedId(null);
      } catch {
        window.alert("Could not parse JSON file.");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  }, [resetHistory]);

  return (
    <div className="flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-[#0a0c12] text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 bg-[#06070f] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">Packing editor</span>
          <Link
            href="/packing"
            className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-100"
          >
            Xem /packing
          </Link>
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 disabled:opacity-35"
            title="Ctrl+Z"
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 disabled:opacity-35"
            title="Ctrl+Shift+Z / Ctrl+Y"
          >
            Redo
          </button>
          <button
            type="button"
            disabled={!layout}
            onClick={saveJson}
            title="localStorage + tải JSON + ghi public/layouts/packing-default.json (dev hoặc PACKING_WRITE_DEFAULT_TO_DISK=true)"
            className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100 disabled:opacity-40"
          >
            Save layout
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
          >
            Load layout
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickFile} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-zinc-800 bg-[#070910] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Add asset</p>
          <div className="flex flex-col gap-1.5">
            {PACKING_EDITOR_PRESETS.map((p) => (
              <button
                key={`${p.label}::${p.src}`}
                type="button"
                disabled={!layout}
                onClick={() => {
                  if (!layout) return;
                  try {
                    const id = newPackingAssetId();
                    withHistory((l) => addPreset(l, p, id));
                    setSelectedId(id);
                  } catch (e) {
                    console.error("add preset", e);
                    window.alert("Không thêm được asset (xem console).");
                  }
                }}
                className="rounded border border-zinc-700 bg-zinc-900/50 px-2 py-1.5 text-left text-[11px] leading-snug text-zinc-200 hover:border-cyan-500/40 disabled:opacity-40"
              >
                + {p.label}
              </button>
            ))}
          </div>

          {layout ? (
            <div className="space-y-1.5 border-t border-zinc-800 pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Lớp (trên cùng trước)</p>
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-0.5">
                {layersTopFirst.map((a) => {
                  const name = a.name?.trim() || a.src.split("/").pop() || a.src;
                  const active = a.id === selectedId;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`w-full truncate rounded border px-2 py-1 text-left text-[10px] leading-tight ${
                          active
                            ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
                        }`}
                        title={a.src}
                      >
                        {name}
                        {a.locked ? " · locked" : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {selected && (
            <div className="space-y-2 border-t border-zinc-800 pt-3 text-[11px]">
              <p className="text-[10px] uppercase text-zinc-500">Selected</p>
              <p className="truncate font-mono text-[10px] text-zinc-400">{selected.id}</p>
              <label className="block text-zinc-400">
                Name
                <input
                  type="text"
                  value={selected.name ?? ""}
                  onChange={(e) =>
                    patchAsset(selected.id, { name: e.target.value.trim() || undefined })
                  }
                  className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200"
                  placeholder="(optional)"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-zinc-400">
                  X
                  <input
                    type="number"
                    step={1}
                    value={selected.x}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { x: Number(e.target.value) || 0 })
                    }
                    className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
                <label className="text-[10px] text-zinc-400">
                  Y
                  <input
                    type="number"
                    step={1}
                    value={selected.y}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { y: Number(e.target.value) || 0 })
                    }
                    className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
                <label className="text-[10px] text-zinc-400">
                  Width
                  <input
                    type="number"
                    step={1}
                    min={8}
                    value={selected.width}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { width: Math.max(8, Number(e.target.value) || 8) })
                    }
                    className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
                <label className="text-[10px] text-zinc-400">
                  Height
                  <input
                    type="number"
                    step={1}
                    min={8}
                    value={selected.height}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { height: Math.max(8, Number(e.target.value) || 8) })
                    }
                    className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
              </div>
              <label className="block text-zinc-400">
                Rotation (°)
                <input
                  type="number"
                  step={1}
                  value={Math.round(selected.rotation)}
                  disabled={selected.locked}
                  onChange={(e) =>
                    patchAsset(selected.id, { rotation: Number(e.target.value) || 0 })
                  }
                  className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                />
              </label>
              <div className="space-y-1 rounded border border-zinc-800 bg-zinc-900/30 p-2">
                <p className="text-[9px] uppercase tracking-wide text-zinc-500">
                  Tilt (2D skew · ±{PACKING_TILT_MAX}°)
                </p>
                <label className="block text-zinc-400">
                  Tilt X
                  <input
                    type="range"
                    min={PACKING_TILT_MIN}
                    max={PACKING_TILT_MAX}
                    step={1}
                    value={clampPackingTilt(selected.tiltX ?? 0)}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { tiltX: clampPackingTilt(Number(e.target.value)) })
                    }
                    className="mt-1 w-full accent-amber-500 disabled:opacity-40"
                  />
                  <input
                    type="number"
                    min={PACKING_TILT_MIN}
                    max={PACKING_TILT_MAX}
                    step={1}
                    value={clampPackingTilt(selected.tiltX ?? 0)}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, {
                        tiltX: clampPackingTilt(Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
                <label className="block text-zinc-400">
                  Tilt Y
                  <input
                    type="range"
                    min={PACKING_TILT_MIN}
                    max={PACKING_TILT_MAX}
                    step={1}
                    value={clampPackingTilt(selected.tiltY ?? 0)}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, { tiltY: clampPackingTilt(Number(e.target.value)) })
                    }
                    className="mt-1 w-full accent-amber-500 disabled:opacity-40"
                  />
                  <input
                    type="number"
                    min={PACKING_TILT_MIN}
                    max={PACKING_TILT_MAX}
                    step={1}
                    value={clampPackingTilt(selected.tiltY ?? 0)}
                    disabled={selected.locked}
                    onChange={(e) =>
                      patchAsset(selected.id, {
                        tiltY: clampPackingTilt(Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                  />
                </label>
              </div>
              <label className="block text-zinc-400">
                Liên kết kho (stack lấy đơn khi chơi)
                <select
                  className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 text-[10px] text-zinc-200"
                  value={selected.packingWarehouseGroupId ?? ""}
                  onChange={(e) =>
                    patchAsset(selected.id, {
                      packingWarehouseGroupId: e.target.value ? e.target.value : undefined,
                    })
                  }
                >
                  <option value="">Không</option>
                  {packingInventoryDefaults.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-zinc-400">
                Z-index
                <input
                  type="number"
                  step={1}
                  value={selected.zIndex}
                  disabled={selected.locked}
                  onChange={(e) =>
                    patchAsset(selected.id, { zIndex: Math.round(Number(e.target.value) || 0) })
                  }
                  className="mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200 disabled:opacity-40"
                />
              </label>
              <label className="flex items-center gap-2 text-zinc-400">
                <input
                  type="checkbox"
                  checked={selected.locked}
                  onChange={(e) => {
                    patchAsset(selected.id, { locked: e.target.checked });
                    if (e.target.checked) setCanvasCropMode(false);
                  }}
                />
                Locked
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-amber-200/90">
                <input
                  type="checkbox"
                  checked={canvasCropMode && !selected.locked}
                  disabled={selected.locked}
                  onChange={(e) => setCanvasCropMode(e.target.checked)}
                />
                <span className="text-[11px]">Chế độ crop trên canvas</span>
              </label>
              {canvasCropMode && !selected.locked ? (
                <p className="text-[9px] leading-snug text-zinc-500">
                  Kéo ảnh = di pan vùng cắt. Tay cầm transform = zoom vùng cắt (không thu nhỏ khung layout). Tắt để
                  chỉnh lại khung/xoay như bình thường.
                </p>
              ) : null}
              <label className="block text-zinc-400">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.opacity}
                  onChange={(e) => patchAsset(selected.id, { opacity: Number(e.target.value) })}
                  className="mt-1 w-full accent-cyan-500"
                />
              </label>
              <PackingCropPanel asset={selected} onApplyCrop={(c) => patchAsset(selected.id, { crop: c })} />
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] hover:border-zinc-500"
                  onClick={() => withHistory((l) => (selected ? bringForward(l, selected.id) : l))}
                >
                  Z ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] hover:border-zinc-500"
                  onClick={() => withHistory((l) => (selected ? sendBackward(l, selected.id) : l))}
                >
                  Z ↓
                </button>
                <button
                  type="button"
                  disabled={selected.locked}
                  className="rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-200/90 disabled:opacity-40"
                  onClick={() => {
                    if (selected.locked) return;
                    withHistory((l) => ({ ...l, assets: l.assets.filter((a) => a.id !== selected.id) }));
                    setSelectedId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </aside>

        <div ref={wrapRef} className="relative min-h-0 min-w-0 flex-1 bg-[#05070c]">
          {layout && !loadError ? (
            <PackingKonvaStage
              layout={layout}
              editMode
              containerWidth={size.w}
              containerHeight={size.h}
              selectedId={selectedId}
              cropEditAssetId={cropEditAssetId}
              onSelectId={setSelectedId}
              onAssetChange={patchAsset}
            />
          ) : loadError ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
              {loadError}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
