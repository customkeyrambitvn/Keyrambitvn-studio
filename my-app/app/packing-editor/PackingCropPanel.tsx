"use client";

import { useEffect, useState } from "react";
import useImage from "use-image";
import type { PackingLayoutAsset, PackingImageCrop } from "@/lib/packing-layout";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

type Props = {
  asset: PackingLayoutAsset;
  onApplyCrop: (crop: PackingImageCrop | undefined) => void;
};

export function PackingCropPanel({ asset, onApplyCrop }: Props) {
  const crossOrigin = /^https?:\/\//i.test(asset.src) ? "anonymous" : undefined;
  const [img] = useImage(asset.src, crossOrigin);

  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [cw, setCw] = useState(100);
  const [ch, setCh] = useState(100);

  useEffect(() => {
    if (!img) return;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    const c = asset.crop;
    setCx(c?.x ?? 0);
    setCy(c?.y ?? 0);
    setCw(c?.width ?? nw);
    setCh(c?.height ?? nh);
  }, [asset.id, asset.crop, img]);

  if (!img) {
    return <p className="text-[10px] text-zinc-500">Đang tải ảnh để crop…</p>;
  }

  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;

  const apply = () => {
    const x = clamp(Math.round(cx), 0, Math.max(0, nw - 1));
    const y = clamp(Math.round(cy), 0, Math.max(0, nh - 1));
    const w = clamp(Math.round(cw), 1, nw - x);
    const h = clamp(Math.round(ch), 1, nh - y);
    const full =
      x === 0 && y === 0 && w === nw && h === nh;
    onApplyCrop(full ? undefined : { x, y, width: w, height: h });
  };

  const inputCls =
    "mt-0.5 w-full rounded border border-zinc-700 bg-[#0a0f1d] px-1.5 py-1 font-mono text-[10px] text-zinc-200";

  return (
    <div className="space-y-2 border-t border-zinc-800 pt-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Crop (px ảnh gốc)</p>
      <p className="text-[10px] text-zinc-500">
        Kích thước file: {nw}×{nh}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-zinc-400">
          X
          <input type="number" className={inputCls} value={cx} onChange={(e) => setCx(Number(e.target.value))} />
        </label>
        <label className="text-[10px] text-zinc-400">
          Y
          <input type="number" className={inputCls} value={cy} onChange={(e) => setCy(Number(e.target.value))} />
        </label>
        <label className="text-[10px] text-zinc-400">
          Width
          <input type="number" className={inputCls} value={cw} onChange={(e) => setCw(Number(e.target.value))} />
        </label>
        <label className="text-[10px] text-zinc-400">
          Height
          <input type="number" className={inputCls} value={ch} onChange={(e) => setCh(Number(e.target.value))} />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={apply}
          className="rounded border border-cyan-500/45 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100"
        >
          Áp dụng crop
        </button>
        <button
          type="button"
          onClick={() => {
            setCx(0);
            setCy(0);
            setCw(nw);
            setCh(nh);
            onApplyCrop(undefined);
          }}
          className="rounded border border-zinc-600 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-500"
        >
          Toàn ảnh (bỏ crop)
        </button>
      </div>
      <p className="text-[9px] leading-snug text-zinc-600">
        Vùng crop map thẳng vào Konva <code className="text-zinc-500">Image.crop</code> (pixel nguồn). Khung trên
        stage vẫn là width/height layout — chỉ phần ảnh bên trong bị cắt.
      </p>
    </div>
  );
}
