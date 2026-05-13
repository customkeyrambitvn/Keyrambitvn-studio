"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { MainNavWithAuth } from "../components/MainNavWithAuth";
import { useProductImageResolve } from "../components/ProductImageContext";
import { useInventoryPersist } from "../hooks/useInventoryPersist";
import { PackingKonvaStage } from "./PackingKonvaStage";
import { PackingKeyrambitWarehouseDrawer, type KeyrambitWarehouseRowVm } from "./PackingKeyrambitWarehouseDrawer";
import { PackingOrdersDrawer } from "./PackingOrdersDrawer";
import { PackingWarehouseDrawer } from "./PackingWarehouseDrawer";
import { INVENTORY_CHANGED_EVENT, readLocalInventory, type InventoryItem } from "@/lib/inventory-local";
import { clientToPackingLayoutCoords, packingLayoutRectToClientViewportRect } from "@/lib/packing-client-to-layout";
import { aggregateKeyrambitInventory, countKeyrambitOnTableById } from "@/lib/packing-keyrambit-inventory";
import { keyrambitIdFromName } from "@/lib/packing-keyrambit-id";
import { buildPackingWorkflowCompletion } from "@/lib/packing-workflow-completion";
import type { PackingChecklistRow } from "@/lib/packing-order-checklist";
import { buildPendingOrderQueue, generateOrder, getKeyrambitStock } from "@/lib/packing-order-generation";
import type { PackingOrder, PlayerKeyrambitInventoryItem } from "@/lib/packing-orders-types";
import {
  PACKING_LAYOUT_DEFAULT_URL,
  PACKING_LAYOUT_LOCALSTORAGE_KEY,
  PACKING_LAYOUT_SAVED_EVENT,
  parsePackingLayout,
  type PackingLayout,
  type PackingLayoutAsset,
} from "@/lib/packing-layout";
import {
  buildWarehouseStockRows,
  createDefaultSinglesLeftMap,
  maxSinglesCapacityForGroup,
  nextUserLayerZ,
  packingInventoryDefaults,
  resolveLayoutWarehouseGroupId,
  type PackingTableKeyrambitItem,
  type PackingTableSingleItem,
} from "@/lib/packing-warehouse";
import {
  getSingleItemSizeForWarehouseGroup,
  getSingleItemSizePx,
  paperBoxGeometryAfterStageChange,
  resolveSingleItemIdForWarehouseGroup,
} from "@/src/config/packing/singleItemSizeConfig";
import type { PaperBoxStage } from "@/lib/packing-paper-box-workflow";
import {
  initialPaperBoxStage,
  packingBagClosedBoxDropHit,
  paperBoxInPackingBagLabelDropHit,
  paperBoxOpenDropHit,
  paperBoxSrcForStage,
  paperBoxTapAdvance,
  isSealedSilverPacketSingle,
  isThankYouCardSingle,
} from "@/lib/packing-paper-box-workflow";
import {
  canDropIntoSilverPacket,
  cloneSilverPacketContentsSnapshot,
  emptySilverPacketContents,
  isSilverBagTableItem,
  silverPacketFilledCount,
  silverPacketOpenDropHit,
  silverPacketSrcForContents,
  type SilverPacketContents,
} from "@/lib/packing-silver-packet-workflow";
import { listLayoutHeaters, silverStuffPacketFullCenterOnHeater } from "@/lib/packing-silver-heater-seal";
import {
  isLayoutPrinterDecorAsset,
  isOrderShipLabelSingle,
  PACKING_ORDER_LABEL_DISPLAY_Z,
  PACKING_ORDER_LABEL_SRC,
} from "@/lib/packing-printer-layout";
import { usePackingSimulatorStore } from "@/src/stores/packing-simulator-store";
import { PackingDesktopBlock, PackingDesktopView } from "./PackingDesktopView";
import { PackingMobileView } from "./PackingMobileView";

const PACKING_STACK_UX_DISMISS_KEY = "packing_stack_ux_hint_dismissed";

/** Cùng lề với vùng thả thùng rác / hoàn đơn (`tryDisposeTableItemAtTrash`, `tryCompleteOrderDrop`). */
const DROP_ZONE_HIT_PAD_PX = 14;

function clientInDropHitpad(clientX: number, clientY: number, r: DOMRect): boolean {
  return (
    clientX >= r.left - DROP_ZONE_HIT_PAD_PX &&
    clientX <= r.right + DROP_ZONE_HIT_PAD_PX &&
    clientY >= r.top - DROP_ZONE_HIT_PAD_PX &&
    clientY <= r.bottom + DROP_ZONE_HIT_PAD_PX
  );
}

export default function PackingPlayerClient() {
  const { saveInventory } = useInventoryPersist();
  const resolveProductImage = useProductImageResolve();

  const layout = usePackingSimulatorStore((s) => s.layout);
  const setLayout = usePackingSimulatorStore((s) => s.setLayout);
  const singlesLeft = usePackingSimulatorStore((s) => s.singlesLeft);
  const setSinglesLeft = usePackingSimulatorStore((s) => s.setSinglesLeft);
  const singleItems = usePackingSimulatorStore((s) => s.singleItems);
  const setSingleItems = usePackingSimulatorStore((s) => s.setSingleItems);
  const keyrambitItems = usePackingSimulatorStore((s) => s.keyrambitItems);
  const setKeyrambitItems = usePackingSimulatorStore((s) => s.setKeyrambitItems);
  const pendingOrders = usePackingSimulatorStore((s) => s.pendingOrders);
  const setPendingOrders = usePackingSimulatorStore((s) => s.setPendingOrders);
  const activeOrder = usePackingSimulatorStore((s) => s.activeOrder);
  const setActiveOrder = usePackingSimulatorStore((s) => s.setActiveOrder);
  const stackUxDismissed = usePackingSimulatorStore((s) => s.stackUxDismissed);
  const setStackUxDismissed = usePackingSimulatorStore((s) => s.setStackUxDismissed);

  const searchParams = useSearchParams();
  const isMobileViewport = useIsMobile();
  const viewParam = searchParams.get("view");
  const showMobileUi = useMemo(() => {
    if (viewParam === "mobile") return true;
    if (viewParam === "desktop") return false;
    return isMobileViewport;
  }, [viewParam, isMobileViewport]);

  const [persistHydrated, setPersistHydrated] = useState(() => usePackingSimulatorStore.persist.hasHydrated());
  const [err, setErr] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [stockoutMessage, setStockoutMessage] = useState<string | null>(null);
  const [warehouseCarryingSingleId, setWarehouseCarryingSingleId] = useState<string | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [orderCompleteHover, setOrderCompleteHover] = useState(false);
  const [keyrambitWarehouseOpen, setKeyrambitWarehouseOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [inventoryFlat, setInventoryFlat] = useState<InventoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [silverSealSession, setSilverSealSession] = useState<{ singleId: string; startMs: number } | null>(null);
  const [silverSealTick, setSilverSealTick] = useState(0);
  const [sealDragPulse, setSealDragPulse] = useState(0);
  const unitSerialRef = useRef<Record<string, number>>({});

  const singlesLeftRef = useRef(singlesLeft);
  singlesLeftRef.current = singlesLeft;
  const singleItemsRef = useRef(singleItems);
  singleItemsRef.current = singleItems;
  const keyrambitItemsRef = useRef(keyrambitItems);
  keyrambitItemsRef.current = keyrambitItems;
  const trashDropRef = useRef<HTMLDivElement>(null);
  const orderCompleteDropRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<PackingLayout | null>(null);
  /** Vị trí layout khi đang kéo (chưa dragEnd) — dùng overlap máy sấy / thanh niêm phong. */
  const liveSingleDragLayoutRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const sealDragPulseThrottleRef = useRef(0);
  const printerWarmupRef = useRef<{ assetId: string; startMs: number } | null>(null);
  const printerWarmupIntervalRef = useRef<number | null>(null);
  const printerWarmupTimeoutRef = useRef<number | null>(null);
  const activeOrderRef = useRef<PackingOrder | null>(null);
  activeOrderRef.current = activeOrder;
  const [printerWarmupTick, setPrinterWarmupTick] = useState(0);

  useEffect(() => {
    if (usePackingSimulatorStore.persist.hasHydrated()) {
      setPersistHydrated(true);
      return;
    }
    const done = usePackingSimulatorStore.persist.onFinishHydration(() => setPersistHydrated(true));
    return () => {
      done?.();
    };
  }, []);

  useEffect(() => {
    if (!persistHydrated) return;
    const sl = usePackingSimulatorStore.getState().singlesLeft;
    if (!sl || Object.keys(sl).length === 0) {
      usePackingSimulatorStore.getState().setSinglesLeft(createDefaultSinglesLeftMap());
    }
  }, [persistHydrated]);

  const syncTrashHoverFromClient = useCallback((clientX: number, clientY: number) => {
    const drop = trashDropRef.current;
    if (!drop) return;
    const inTrash = clientInDropHitpad(clientX, clientY, drop.getBoundingClientRect());
    setTrashHover((prev) => (prev === inTrash ? prev : inTrash));
    setOrderCompleteHover(false);
  }, []);

  /** Kéo đơn trên bàn: hover thùng rác + vùng hoàn đơn (chỉ khi đang kéo `packing-bag-done`). */
  const syncSingleDragScreenHover = useCallback((id: string, clientX: number, clientY: number) => {
    const trashEl = trashDropRef.current;
    if (trashEl) {
      const inTrash = clientInDropHitpad(clientX, clientY, trashEl.getBoundingClientRect());
      setTrashHover((prev) => (prev === inTrash ? prev : inTrash));
    }
    const doneEl = orderCompleteDropRef.current;
    const item = singleItemsRef.current.find((s) => s.id === id);
    const isDoneBag =
      item?.groupId === "paper_box" && (item.paperBoxStage ?? "") === "packingBagDone";
    let inComplete = false;
    if (doneEl && isDoneBag) {
      inComplete = clientInDropHitpad(clientX, clientY, doneEl.getBoundingClientRect());
    }
    setOrderCompleteHover((prev) => (prev === inComplete ? prev : inComplete));
  }, []);

  const clearPrinterWarmupTimers = useCallback(() => {
    if (printerWarmupIntervalRef.current != null) {
      window.clearInterval(printerWarmupIntervalRef.current);
      printerWarmupIntervalRef.current = null;
    }
    if (printerWarmupTimeoutRef.current != null) {
      window.clearTimeout(printerWarmupTimeoutRef.current);
      printerWarmupTimeoutRef.current = null;
    }
  }, []);

  /** Konva dragMove: sync vị trí layout tạm (không merge/thùng rác) để overlap máy sấy chạy khi còn giữ kéo. */
  const handleSingleItemDragMoveLayout = useCallback((id: string, lx: number, ly: number) => {
    liveSingleDragLayoutRef.current = { id, x: lx, y: ly };
    const it = singleItemsRef.current.find((s) => s.id === id);
    if (it?.groupId !== "silver_bag") return;
    if (silverPacketFilledCount(it.silverPacketContents) < 3) return;
    const now = Date.now();
    if (now - sealDragPulseThrottleRef.current < 50) return;
    sealDragPulseThrottleRef.current = now;
    setSealDragPulse((p) => p + 1);
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const sync = () => setInventoryFlat(readLocalInventory());
    sync();
    window.addEventListener(INVENTORY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(INVENTORY_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!persistHydrated) return;
    setPendingOrders((prev) => (prev.length === 0 ? buildPendingOrderQueue(5, readLocalInventory()) : prev));
  }, [persistHydrated, setPendingOrders]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    if (!layout) {
      setSilverSealSession(null);
      return;
    }
    const heaters = listLayoutHeaters(layout);
    if (heaters.length === 0) {
      setSilverSealSession(null);
      return;
    }
    let found: string | null = null;
    const live = liveSingleDragLayoutRef.current;
    for (const s of singleItems) {
      if (s.groupId !== "silver_bag") continue;
      if (silverPacketFilledCount(s.silverPacketContents) < 3) continue;
      const eff = live?.id === s.id ? { ...s, x: live.x, y: live.y } : s;
      if (!silverStuffPacketFullCenterOnHeater(eff, heaters)) continue;
      found = s.id;
      break;
    }
    setSilverSealSession((prev) => {
      if (!found) return null;
      if (prev?.singleId === found) return prev;
      return { singleId: found, startMs: Date.now() };
    });
  }, [layout, singleItems, sealDragPulse]);

  useEffect(() => {
    if (!silverSealSession || !layoutRef.current) return;
    const { singleId, startMs } = silverSealSession;
    const iv = window.setInterval(() => {
      const lay = layoutRef.current;
      if (!lay) return;
      const heaters = listLayoutHeaters(lay);
      const live = liveSingleDragLayoutRef.current;
      const itemRaw = singleItemsRef.current.find((s) => s.id === singleId);
      const item =
        itemRaw && live?.id === itemRaw.id ? { ...itemRaw, x: live.x, y: live.y } : itemRaw;
      if (
        !item ||
        item.groupId !== "silver_bag" ||
        silverPacketFilledCount(item.silverPacketContents) < 3 ||
        !silverStuffPacketFullCenterOnHeater(item, heaters)
      ) {
        setSilverSealSession(null);
        return;
      }
      if (Date.now() - startMs >= 1000) {
        const liveSealSnap = liveSingleDragLayoutRef.current;
        liveSingleDragLayoutRef.current = null;
        setSingleItems((prev) =>
          prev.map((s) => {
            if (s.id !== singleId) return s;
            if (s.groupId !== "silver_bag") return s;
            const g = packingInventoryDefaults.find((x) => x.groupId === "silver_sealed_bag");
            if (!g) return s;
            const itemId = resolveSingleItemIdForWarehouseGroup("silver_sealed_bag");
            const { width: nw, height: nh } = getSingleItemSizeForWarehouseGroup("silver_sealed_bag");
            const eff = liveSealSnap?.id === s.id ? { ...s, x: liveSealSnap.x, y: liveSealSnap.y } : s;
            const cx = eff.x + eff.width / 2;
            const cy = eff.y + eff.height / 2;
            const snap =
              s.silverPacketContents != null
                ? cloneSilverPacketContentsSnapshot(s.silverPacketContents)
                : undefined;
            return {
              ...s,
              groupId: "silver_sealed_bag",
              itemId,
              name: g.name,
              src: g.singleItemSrc,
              width: nw,
              height: nh,
              x: cx - nw / 2,
              y: cy - nh / 2,
              silverPacketContents: snap,
            };
          }),
        );
        setSilverSealSession(null);
        return;
      }
      setSilverSealTick((x) => x + 1);
    }, 32);
    return () => window.clearInterval(iv);
  }, [silverSealSession]);

  useEffect(() => {
    if (!persistHydrated) return;
    let cancelled = false;

    const finish = (p: PackingLayout | null, error: string | null) => {
      if (cancelled) return;
      if (p) {
        setLayout(p);
        setErr(null);
        return;
      }
      setLayout(null);
      setErr(error);
    };

    const loadFromNetwork = async (): Promise<{ layout: PackingLayout | null; error: string | null }> => {
      try {
        const r = await fetch(PACKING_LAYOUT_DEFAULT_URL);
        if (!r.ok) throw new Error("not found");
        const json = await r.json();
        const p = parsePackingLayout(json);
        if (!p) throw new Error("invalid");
        return { layout: p, error: null };
      } catch {
        return { layout: null, error: "Could not load packing layout." };
      }
    };

    const load = async () => {
      const fromStore = usePackingSimulatorStore.getState().layout;
      if (fromStore) {
        finish(fromStore, null);
        return;
      }
      try {
        const raw = localStorage.getItem(PACKING_LAYOUT_LOCALSTORAGE_KEY);
        if (raw) {
          try {
            const json = JSON.parse(raw) as unknown;
            const p = parsePackingLayout(json);
            if (p) {
              finish(p, null);
              return;
            }
            console.warn(
              "[packing] Có dữ liệu trong localStorage nhưng không đúng schema (parsePackingLayout trả null).",
              "Kiểm tra version, assets, số. Dùng layout mặc định từ",
              PACKING_LAYOUT_DEFAULT_URL,
            );
          } catch (e) {
            console.warn("[packing] JSON trong localStorage không parse được — dùng layout mặc định.", e);
          }
        }
      } catch (e) {
        console.warn("[packing] Không đọc được localStorage — dùng layout mặc định.", e);
      }
      const { layout: net, error } = await loadFromNetwork();
      finish(net, error);
    };

    void load();

    const onStorage = (e: StorageEvent) => {
      if (e.key === PACKING_LAYOUT_LOCALSTORAGE_KEY || e.key === null) void load();
    };
    const onSaved = () => void load();

    window.addEventListener("storage", onStorage);
    window.addEventListener(PACKING_LAYOUT_SAVED_EVENT, onSaved);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PACKING_LAYOUT_SAVED_EVENT, onSaved);
    };
  }, [persistHydrated, setLayout]);

  useEffect(() => {
    if (!persistHydrated) return;
    try {
      if (localStorage.getItem(PACKING_STACK_UX_DISMISS_KEY) === "1") {
        setStackUxDismissed(true);
      }
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia("(pointer: fine)");
    const syncPointer = () => setFinePointer(mq.matches);
    syncPointer();
    mq.addEventListener("change", syncPointer);
    return () => mq.removeEventListener("change", syncPointer);
  }, [persistHydrated, setStackUxDismissed]);

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

  const noopSelect = useCallback((_id: string | null) => {}, []);
  const noopChange = useCallback((_id: string, _patch: Partial<PackingLayoutAsset>) => {}, []);

  const stockRows = useMemo(() => buildWarehouseStockRows(singlesLeft), [singlesLeft]);

  const layoutHasWarehouseStacks = useMemo(
    () => Boolean(layout?.assets.some((a) => resolveLayoutWarehouseGroupId(a))),
    [layout],
  );

  const orderChecklist = useMemo(() => {
    if (!activeOrder) {
      return { rows: [] as PackingChecklistRow[], allOk: false };
    }
    return buildPackingWorkflowCompletion(activeOrder, keyrambitItems, singleItems);
  }, [activeOrder, keyrambitItems, singleItems]);

  const resolveKeyrambitStock = useCallback(
    (keyrambitId: string) => getKeyrambitStock(keyrambitId, inventoryFlat),
    [inventoryFlat],
  );

  const keyrambitWarehouseRows = useMemo((): KeyrambitWarehouseRowVm[] => {
    const agg = aggregateKeyrambitInventory(inventoryFlat);
    return agg.map((a) => {
      const onTable = countKeyrambitOnTableById(keyrambitItems, a.keyrambitId);
      const canDrag = a.quantity > onTable;
      const displaySrc = resolveProductImage(a.name, a.imageSrc || null) ?? "";
      return { ...a, canDrag, displaySrc };
    });
  }, [inventoryFlat, keyrambitItems, resolveProductImage]);

  const handleLayoutWarehouseDragSpawnAt = useCallback(
    (asset: PackingLayoutAsset, groupId: string, lx: number, ly: number): string | null => {
      if (!layout) return null;
      const left = singlesLeftRef.current[groupId] ?? 0;
      if (left <= 0) {
        setStockoutMessage("vật dụng đã hết, vui lòng bổ sung!!");
        window.setTimeout(() => setStockoutMessage(null), 3200);
        return null;
      }
      const g = packingInventoryDefaults.find((x) => x.groupId === groupId);
      if (!g) return null;

      const n = (unitSerialRef.current[groupId] = (unitSerialRef.current[groupId] ?? 0) + 1);
      const sid = `${groupId}-u-${String(n).padStart(3, "0")}`;

      setSinglesLeft((prev) => {
        const cur = prev[groupId] ?? 0;
        if (cur <= 0) return prev;
        return { ...prev, [groupId]: cur - 1 };
      });

      setSingleItems((prev) => {
        const z = nextUserLayerZ(layout, [], prev, keyrambitItemsRef.current);
        const itemId = resolveSingleItemIdForWarehouseGroup(groupId);
        const { width: sw, height: sh } = getSingleItemSizeForWarehouseGroup(groupId);
        const st = groupId === "paper_box" ? initialPaperBoxStage() : undefined;
        const silverC = groupId === "silver_bag" ? emptySilverPacketContents() : undefined;
        const single: PackingTableSingleItem = {
          type: "singleItem",
          id: sid,
          groupId,
          itemId,
          name: g.name,
          src:
            groupId === "silver_bag"
              ? silverPacketSrcForContents(silverC, g.singleItemSrc)
              : st
                ? paperBoxSrcForStage(st)
                : g.singleItemSrc,
          x: lx - sw / 2,
          y: ly - sh / 2,
          width: sw,
          height: sh,
          rotation: 0,
          zIndex: z,
          ...(st ? { paperBoxStage: st } : {}),
          ...(silverC ? { silverPacketContents: silverC } : {}),
        };
        return [...prev, single];
      });

      setWarehouseCarryingSingleId(sid);
      return sid;
    },
    [layout],
  );

  const handleLayoutWarehouseDragMoveSingle = useCallback((singleId: string, lx: number, ly: number) => {
    setSingleItems((prev) => {
      const item = prev.find((s) => s.id === singleId);
      if (!item) return prev;
      return prev.map((p) =>
        p.id === singleId ? { ...p, x: lx - p.width / 2, y: ly - p.height / 2 } : p,
      );
    });
  }, []);

  const handleLayoutWarehousePickGestureEnd = useCallback(() => {
    setWarehouseCarryingSingleId(null);
    setTrashHover(false);
  }, []);

  const handleLayoutWarehouseStackTap = useCallback(
    (asset: PackingLayoutAsset, groupId: string) => {
      if (!layout) return;
      const left = singlesLeftRef.current[groupId] ?? 0;
      if (left <= 0) {
        setStockoutMessage("vật dụng đã hết, vui lòng bổ sung!!");
        window.setTimeout(() => setStockoutMessage(null), 3200);
        return;
      }
      const g = packingInventoryDefaults.find((x) => x.groupId === groupId);
      if (!g) return;

      setSinglesLeft((prev) => {
        const cur = prev[groupId] ?? 0;
        if (cur <= 0) return prev;
        return { ...prev, [groupId]: cur - 1 };
      });

      setSingleItems((prev) => {
        const z = nextUserLayerZ(layout, [], prev, keyrambitItemsRef.current);
        const n = (unitSerialRef.current[groupId] = (unitSerialRef.current[groupId] ?? 0) + 1);
        const sid = `${groupId}-u-${String(n).padStart(3, "0")}`;
        const idx = prev.filter((p) => p.groupId === groupId).length;
        const ox = (idx % 14) * 12;
        const oy = Math.floor(idx / 14) * 10;
        const itemId = resolveSingleItemIdForWarehouseGroup(groupId);
        const { width: sw, height: sh } = getSingleItemSizeForWarehouseGroup(groupId);
        const st = groupId === "paper_box" ? initialPaperBoxStage() : undefined;
        const silverC = groupId === "silver_bag" ? emptySilverPacketContents() : undefined;
        const single: PackingTableSingleItem = {
          type: "singleItem",
          id: sid,
          groupId,
          itemId,
          name: g.name,
          src:
            groupId === "silver_bag"
              ? silverPacketSrcForContents(silverC, g.singleItemSrc)
              : st
                ? paperBoxSrcForStage(st)
                : g.singleItemSrc,
          x: asset.x + asset.width / 2 - sw / 2 + ox,
          y: asset.y + asset.height * 0.55 + oy,
          width: sw,
          height: sh,
          rotation: 0,
          zIndex: z,
          ...(st ? { paperBoxStage: st } : {}),
          ...(silverC ? { silverPacketContents: silverC } : {}),
        };
        return [...prev, single];
      });
    },
    [layout],
  );

  const restoreSilverPacketContentsToStock = useCallback((c: SilverPacketContents) => {
    if (c.keyrambit) {
      const inv = readLocalInventory();
      const row: InventoryItem = {
        id: `rest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: c.keyrambit.name,
        rarity: c.keyrambit.rarity,
        boxName: c.keyrambit.boxName,
        acquiredAt: new Date().toISOString(),
        ...(c.keyrambit.image ? { image: c.keyrambit.image } : {}),
      };
      saveInventory([...inv, row]);
    }
    setSinglesLeft((prev) => {
      let next = { ...prev };
      const bump = (gid: string) => {
        const def = packingInventoryDefaults.find((d) => d.groupId === gid);
        const cap = def ? maxSinglesCapacityForGroup(def) : (next[gid] ?? 0) + 1;
        next = { ...next, [gid]: Math.min(cap, (next[gid] ?? 0) + 1) };
      };
      if (c.keychain) bump("keychain_ring");
      if (c.silica) bump("silica_gel");
      return next;
    });
  }, [saveInventory]);

  const tryDisposeTableItemAtTrash = useCallback((id: string, clientX: number, clientY: number): boolean => {
    const drop = trashDropRef.current;
    if (!drop) return false;
    const r = drop.getBoundingClientRect();
    if (!clientInDropHitpad(clientX, clientY, r)) {
      return false;
    }
    const kb = keyrambitItemsRef.current.find((k) => k.id === id);
    if (kb) {
      setKeyrambitItems((prev) => prev.filter((k) => k.id !== id));
      return true;
    }
    const item = singleItemsRef.current.find((s) => s.id === id);
    if (!item) return false;
    setSilverSealSession((s) => (s?.singleId === id ? null : s));
    if (liveSingleDragLayoutRef.current?.id === id) liveSingleDragLayoutRef.current = null;

    if (item.groupId === "silver_bag" && silverPacketFilledCount(item.silverPacketContents) > 0) {
      const c = item.silverPacketContents ?? emptySilverPacketContents();
      restoreSilverPacketContentsToStock(c);
      setSingleItems((prev) => prev.filter((s) => s.id !== id));
      return true;
    }

    if (item.groupId === "silver_sealed_bag" && silverPacketFilledCount(item.silverPacketContents) > 0) {
      const c = item.silverPacketContents ?? emptySilverPacketContents();
      restoreSilverPacketContentsToStock(c);
      setSingleItems((prev) => prev.filter((s) => s.id !== id));
      return true;
    }

    if (isOrderShipLabelSingle(item)) {
      setSingleItems((prev) => prev.filter((s) => s.id !== id));
      return true;
    }

    if (item.groupId === "paper_box") {
      const carried = item.paperBoxSealedSilverContents;
      if (carried && silverPacketFilledCount(carried) > 0) {
        restoreSilverPacketContentsToStock(carried);
      }
    }

    setSingleItems((prev) => prev.filter((s) => s.id !== id));
    setSinglesLeft((prev) => {
      const def = packingInventoryDefaults.find((d) => d.groupId === item.groupId);
      const cap = def ? maxSinglesCapacityForGroup(def) : (prev[item.groupId] ?? 0) + 1;
      const next = (prev[item.groupId] ?? 0) + 1;
      let out: Record<string, number> = { ...prev, [item.groupId]: Math.min(cap, next) };
      if (item.groupId === "paper_box" && ((item.paperBoxStage ?? "") === "inPackingBag" || (item.paperBoxStage ?? "") === "packingBagDone")) {
        const dBag = packingInventoryDefaults.find((d) => d.groupId === "shipping_bag");
        const capBag = dBag ? maxSinglesCapacityForGroup(dBag) : (out["shipping_bag"] ?? 0) + 1;
        const nBag = (out["shipping_bag"] ?? 0) + 1;
        out = { ...out, shipping_bag: Math.min(capBag, nBag) };
      }
      return out;
    });
    return true;
  }, [saveInventory, restoreSilverPacketContentsToStock]);

  const handlePrinterTap = useCallback(
    (asset: PackingLayoutAsset) => {
      if (!isLayoutPrinterDecorAsset(asset)) return;
      if (!activeOrderRef.current) return;

      if (singleItemsRef.current.some(isOrderShipLabelSingle)) {
        queueMicrotask(() =>
          setToastMessage("Đã có label trên bàn — bỏ vào thùng rác để in lại."),
        );
        return;
      }
      if (printerWarmupRef.current) return;

      clearPrinterWarmupTimers();
      printerWarmupRef.current = { assetId: asset.id, startMs: Date.now() };
      const capId = asset.id;
      printerWarmupIntervalRef.current = window.setInterval(() => {
        setPrinterWarmupTick((x) => x + 1);
      }, 50);
      printerWarmupTimeoutRef.current = window.setTimeout(() => {
        if (printerWarmupIntervalRef.current != null) {
          window.clearInterval(printerWarmupIntervalRef.current);
          printerWarmupIntervalRef.current = null;
        }
        printerWarmupTimeoutRef.current = null;
        printerWarmupRef.current = null;
        setPrinterWarmupTick((x) => x + 1);
        if (!activeOrderRef.current) return;

        const assetSnap = layoutRef.current?.assets.find((a) => a.id === capId);
        if (!assetSnap) return;

        setSingleItems((prev) => {
          const lay = layoutRef.current;
          if (!lay) return prev;
          if (prev.some(isOrderShipLabelSingle)) return prev;
          const { width: lw, height: lh } = getSingleItemSizePx("order_ship_label");
          const cx = assetSnap.x + assetSnap.width * 0.72;
          const cy = assetSnap.y + assetSnap.height * 0.38;
          const id = `order-label-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const single: PackingTableSingleItem = {
            type: "singleItem",
            id,
            groupId: "order_ship_label",
            itemId: "order_ship_label",
            name: "Label đơn",
            src: PACKING_ORDER_LABEL_SRC,
            x: cx - lw / 2,
            y: cy - lh / 2,
            width: lw,
            height: lh,
            rotation: 0,
            zIndex: PACKING_ORDER_LABEL_DISPLAY_Z,
          };
          return [...prev, single];
        });
      }, 3000);
      setPrinterWarmupTick((x) => x + 1);
    },
    [clearPrinterWarmupTimers],
  );

  const playPrinterForKonva = useMemo(() => {
    void printerWarmupTick;
    const w = printerWarmupRef.current;
    return {
      warmingAssetId: w?.assetId ?? null,
      warmingProgress01: w ? Math.min(1, (Date.now() - w.startMs) / 3000) : 0,
      onPrinterTap: handlePrinterTap,
    };
  }, [printerWarmupTick, handlePrinterTap]);

  useEffect(() => {
    if (activeOrder != null) return;
    clearPrinterWarmupTimers();
    printerWarmupRef.current = null;
    setPrinterWarmupTick((x) => x + 1);
  }, [activeOrder, clearPrinterWarmupTimers]);

  const finalizeActiveOrder = useCallback(
    (opts?: { finishedPaperBoxId?: string }): boolean => {
      const orderSnapshot = activeOrderRef.current;
      if (!orderSnapshot) return false;
      const wf = buildPackingWorkflowCompletion(
        orderSnapshot,
        keyrambitItemsRef.current,
        singleItemsRef.current,
      );
      if (!wf.allOk) {
        setToastMessage("Chưa đủ điều kiện checklist.");
        return false;
      }

      const finishedId =
        opts?.finishedPaperBoxId ??
        singleItemsRef.current.find((s) => s.groupId === "paper_box" && s.paperBoxStage === "packingBagDone")?.id;
      if (!finishedId) {
        setToastMessage("Chưa có gói packing-bag-done để hoàn đơn.");
        return false;
      }

      const finishedBox = singleItemsRef.current.find((s) => s.id === finishedId);
      const inFinishedPackage =
        finishedBox?.groupId === "paper_box" &&
        finishedBox.paperBoxSealedSilverContents?.keyrambit &&
        keyrambitIdFromName(finishedBox.paperBoxSealedSilverContents.keyrambit.name) ===
          orderSnapshot.requiredKeyrambitId
          ? 1
          : 0;

      const flat = readLocalInventory();
      const stock = getKeyrambitStock(orderSnapshot.requiredKeyrambitId, flat);
      const onTable = countKeyrambitOnTableById(keyrambitItemsRef.current, orderSnapshot.requiredKeyrambitId);
      const need = orderSnapshot.requiredQuantity;
      /** Đã trừ kho lúc nhét Keyrambit vào túi bạc — chỉ còn trừ thêm phần chưa “đóng” trong gói hoàn chỉnh. */
      const remainingToTakeFromFlat = Math.max(0, need - inFinishedPackage);
      if (stock < remainingToTakeFromFlat) {
        setToastMessage("Không đủ Keyrambit trong kho để hoàn thành đơn");
        return false;
      }

      const nextInv = [...flat];
      let removed = 0;
      for (let i = nextInv.length - 1; i >= 0 && removed < remainingToTakeFromFlat; i--) {
        if (keyrambitIdFromName(nextInv[i]!.name) === orderSnapshot.requiredKeyrambitId) {
          nextInv.splice(i, 1);
          removed++;
        }
      }
      if (removed < remainingToTakeFromFlat) {
        setToastMessage("Không đủ Keyrambit trong kho để hoàn thành đơn");
        return false;
      }

      saveInventory(nextInv);

      const removeFromTable = Math.min(onTable, Math.max(0, need - inFinishedPackage));
      setKeyrambitItems((kPrev) => {
        let left = removeFromTable;
        return kPrev.filter((k) => {
          if (left > 0 && k.keyrambitId === orderSnapshot.requiredKeyrambitId) {
            left--;
            return false;
          }
          return true;
        });
      });

      setSingleItems((sPrev) => sPrev.filter((s) => s.id !== finishedId));

      setActiveOrder(null);
      setOrdersOpen(false);
      setToastMessage("Đã đóng xong đơn hàng");
      return true;
    },
    [saveInventory],
  );

  const tryCompleteOrderDrop = useCallback(
    (id: string, clientX: number, clientY: number): boolean => {
      const dropEl = orderCompleteDropRef.current;
      if (!dropEl) return false;
      const item = singleItemsRef.current.find((s) => s.id === id);
      if (item?.groupId !== "paper_box" || (item.paperBoxStage ?? "") !== "packingBagDone") return false;
      const r = dropEl.getBoundingClientRect();
      if (!clientInDropHitpad(clientX, clientY, r)) return false;
      return finalizeActiveOrder({ finishedPaperBoxId: id });
    },
    [finalizeActiveOrder],
  );

  const tryMergeClosedPaperBoxOntoPackingBag = useCallback((draggedId: string, newX: number, newY: number): boolean => {
    const dragged = singleItemsRef.current.find((s) => s.id === draggedId);
    if (!dragged || dragged.groupId !== "paper_box") return false;
    if ((dragged.paperBoxStage ?? "unfold") !== "closed") return false;
    const cx = newX + dragged.width / 2;
    const cy = newY + dragged.height / 2;
    const list = singleItemsRef.current;
    for (const bag of list) {
      if (bag.id === draggedId) continue;
      if (bag.groupId !== "shipping_bag") continue;
      if (!packingBagClosedBoxDropHit(cx, cy, bag)) continue;
      const bagId = bag.id;
      setSingleItems((prev) => {
        const bagItem = prev.find((s) => s.id === bagId);
        if (!bagItem) return prev;
        const nextStage = "inPackingBag" as const;
        return prev
          .filter((s) => s.id !== bagId)
          .map((s) => {
            if (s.id !== draggedId) return s;
            const geo = paperBoxGeometryAfterStageChange(
              bagItem.x,
              bagItem.y,
              bagItem.width,
              bagItem.height,
              nextStage,
            );
            return {
              ...s,
              ...geo,
              paperBoxStage: nextStage,
              src: paperBoxSrcForStage(nextStage),
            };
          });
      });
      return true;
    }

    const lay = layoutRef.current;
    if (lay) {
      for (const asset of lay.assets) {
        if (resolveLayoutWarehouseGroupId(asset) !== "shipping_bag") continue;
        if (!packingBagClosedBoxDropHit(cx, cy, asset)) continue;
        const nextStage = "inPackingBag" as const;
        setSingleItems((prev) =>
          prev.map((s) => {
            if (s.id !== draggedId) return s;
            const geo = paperBoxGeometryAfterStageChange(
              asset.x,
              asset.y,
              asset.width,
              asset.height,
              nextStage,
            );
            return {
              ...s,
              ...geo,
              paperBoxStage: nextStage,
              src: paperBoxSrcForStage(nextStage),
            };
          }),
        );
        return true;
      }
    }
    return false;
  }, []);

  const tryMergeOrderLabelOntoBoxInPackingBag = useCallback((draggedId: string, newX: number, newY: number): boolean => {
    const dragged = singleItemsRef.current.find((s) => s.id === draggedId);
    if (!dragged || dragged.groupId !== "order_ship_label") return false;
    const cx = newX + dragged.width / 2;
    const cy = newY + dragged.height / 2;
    const list = singleItemsRef.current;
    for (const box of list) {
      if (box.id === draggedId) continue;
      if (box.groupId !== "paper_box") continue;
      if ((box.paperBoxStage ?? "unfold") !== "inPackingBag") continue;
      if (!paperBoxInPackingBagLabelDropHit(cx, cy, box)) continue;
      const targetId = box.id;
      const nextStage = "packingBagDone" as const;
      setSingleItems((prev) =>
        prev
          .filter((s) => s.id !== draggedId)
          .map((s) => {
            if (s.id !== targetId) return s;
            const geo = paperBoxGeometryAfterStageChange(s.x, s.y, s.width, s.height, nextStage);
            return {
              ...s,
              ...geo,
              paperBoxStage: nextStage,
              src: paperBoxSrcForStage(nextStage),
            };
          }),
      );
      return true;
    }
    return false;
  }, []);

  const tryMergeDraggedOntoPaperBox = useCallback((draggedId: string, newX: number, newY: number): boolean => {
    const dragged = singleItemsRef.current.find((s) => s.id === draggedId);
    if (!dragged || dragged.groupId === "paper_box") return false;
    const cx = newX + dragged.width / 2;
    const cy = newY + dragged.height / 2;
    const list = singleItemsRef.current;
    let targetId: string | null = null;
    let nextStage: PaperBoxStage | null = null;
    let sealedSnapshotFromDrag: SilverPacketContents | null = null;
    for (const box of list) {
      if (box.id === draggedId) continue;
      if (box.groupId !== "paper_box") continue;
      const stage = box.paperBoxStage ?? "unfold";
      if (stage !== "open" && stage !== "withSilver") continue;
      if (!paperBoxOpenDropHit(cx, cy, box)) continue;
      if (stage === "open" && isSealedSilverPacketSingle(dragged)) {
        targetId = box.id;
        nextStage = "withSilver";
        sealedSnapshotFromDrag = cloneSilverPacketContentsSnapshot(
          dragged.silverPacketContents ?? emptySilverPacketContents(),
        );
        break;
      }
      if (stage === "withSilver" && isThankYouCardSingle(dragged)) {
        targetId = box.id;
        nextStage = "full";
        break;
      }
    }
    if (!targetId || !nextStage) return false;
    setSingleItems((prev) =>
      prev
        .filter((s) => s.id !== draggedId)
        .map((s) => {
          if (s.id !== targetId) return s;
          const geo = paperBoxGeometryAfterStageChange(s.x, s.y, s.width, s.height, nextStage);
          return {
            ...s,
            ...geo,
            paperBoxStage: nextStage,
            src: paperBoxSrcForStage(nextStage),
            ...(nextStage === "withSilver" && sealedSnapshotFromDrag
              ? { paperBoxSealedSilverContents: sealedSnapshotFromDrag }
              : {}),
          };
        }),
    );
    return true;
  }, []);

  const tryMergeDraggedOntoSilverPacket = useCallback((draggedSingleId: string, newX: number, newY: number): boolean => {
    const dragged = singleItemsRef.current.find((s) => s.id === draggedSingleId);
    if (!dragged) return false;
    const kind =
      dragged.groupId === "keychain_ring"
        ? ("keychain" as const)
        : dragged.groupId === "silica_gel"
          ? ("silica" as const)
          : null;
    if (!kind) return false;

    const cx = newX + dragged.width / 2;
    const cy = newY + dragged.height / 2;
    const list = singleItemsRef.current;
    const gSilver = packingInventoryDefaults.find((x) => x.groupId === "silver_bag");
    const emptySrc = gSilver?.singleItemSrc ?? "/minigames/packing-simulator/assets/packaging/silver-packet.png";

    for (const bag of list) {
      if (bag.id === draggedSingleId) continue;
      if (!isSilverBagTableItem(bag.groupId)) continue;
      if (!silverPacketOpenDropHit(cx, cy, bag)) continue;
      const curC = bag.silverPacketContents ?? emptySilverPacketContents();
      if (!canDropIntoSilverPacket(curC, kind)) continue;

      const nextC: SilverPacketContents =
        kind === "keychain" ? { ...curC, keychain: true } : { ...curC, silica: true };
      const nextSrc = silverPacketSrcForContents(nextC, emptySrc);

      setSingleItems((prev) =>
        prev
          .filter((s) => s.id !== draggedSingleId)
          .map((s) => (s.id === bag.id ? { ...s, silverPacketContents: nextC, src: nextSrc } : s)),
      );
      return true;
    }
    return false;
  }, []);

  const tryMergeKeyrambitOntoSilverPacket = useCallback(
    (draggedKbId: string, newX: number, newY: number): boolean => {
      const kb = keyrambitItemsRef.current.find((k) => k.id === draggedKbId);
      if (!kb) return false;
      const cx = newX + kb.width / 2;
      const cy = newY + kb.height / 2;
      const list = singleItemsRef.current;
      const gSilver = packingInventoryDefaults.find((x) => x.groupId === "silver_bag");
      const emptySrc = gSilver?.singleItemSrc ?? "/minigames/packing-simulator/assets/packaging/silver-packet.png";

      for (const bag of list) {
        if (bag.id === draggedKbId) continue;
        if (!isSilverBagTableItem(bag.groupId)) continue;
        if (!silverPacketOpenDropHit(cx, cy, bag)) continue;
        const curC = bag.silverPacketContents ?? emptySilverPacketContents();
        if (!canDropIntoSilverPacket(curC, "keyrambit")) continue;

        const flat = readLocalInventory();
        let removeIdx = -1;
        for (let i = flat.length - 1; i >= 0; i--) {
          if (keyrambitIdFromName(flat[i]!.name) === kb.keyrambitId) {
            removeIdx = i;
            break;
          }
        }
        if (removeIdx < 0) return false;
        const removed = flat[removeIdx]!;
        const nextFlat = flat.filter((_, i) => i !== removeIdx);
        saveInventory(nextFlat);

        const snap: SilverPacketContents["keyrambit"] = {
          name: removed.name,
          image: removed.image?.trim() || undefined,
          rarity: removed.rarity,
          boxName: removed.boxName,
        };
        const nextC: SilverPacketContents = { ...curC, keyrambit: snap };
        const nextSrc = silverPacketSrcForContents(nextC, emptySrc);

        setKeyrambitItems((prev) => prev.filter((k) => k.id !== draggedKbId));
        setSingleItems((prev) =>
          prev.map((s) => (s.id === bag.id ? { ...s, silverPacketContents: nextC, src: nextSrc } : s)),
        );
        return true;
      }
      return false;
    },
    [saveInventory],
  );

  const handleSingleItemTap = useCallback((id: string) => {
    setSingleItems((prev) => {
      const item = prev.find((s) => s.id === id);
      if (!item || item.groupId !== "paper_box") return prev;
      const st = item.paperBoxStage ?? "unfold";
      const nextSt = paperBoxTapAdvance(st);
      if (nextSt === null) return prev;
      return prev.map((s) => {
        if (s.id !== id) return s;
        const geo = paperBoxGeometryAfterStageChange(s.x, s.y, s.width, s.height, nextSt);
        return {
          ...s,
          ...geo,
          paperBoxStage: nextSt,
          src: paperBoxSrcForStage(nextSt),
        };
      });
    });
  }, []);

  const handleSingleItemMove = useCallback(
    (id: string, x: number, y: number, clientX?: number, clientY?: number) => {
      try {
        liveSingleDragLayoutRef.current = null;
        if (typeof clientX === "number" && typeof clientY === "number") {
          if (tryCompleteOrderDrop(id, clientX, clientY)) return;
          if (tryDisposeTableItemAtTrash(id, clientX, clientY)) return;
        }
        if (tryMergeDraggedOntoSilverPacket(id, x, y)) return;
        if (tryMergeOrderLabelOntoBoxInPackingBag(id, x, y)) return;
        if (tryMergeClosedPaperBoxOntoPackingBag(id, x, y)) return;
        if (tryMergeDraggedOntoPaperBox(id, x, y)) return;
        setSingleItems((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
      } finally {
        if (typeof clientX === "number") {
          setTrashHover(false);
          setOrderCompleteHover(false);
        }
      }
    },
    [
      tryCompleteOrderDrop,
      tryDisposeTableItemAtTrash,
      tryMergeDraggedOntoSilverPacket,
      tryMergeOrderLabelOntoBoxInPackingBag,
      tryMergeClosedPaperBoxOntoPackingBag,
      tryMergeDraggedOntoPaperBox,
    ],
  );

  const handleKeyrambitItemMove = useCallback(
    (id: string, x: number, y: number, clientX?: number, clientY?: number) => {
      try {
        if (typeof clientX === "number" && typeof clientY === "number") {
          if (tryDisposeTableItemAtTrash(id, clientX, clientY)) return;
        }
        if (tryMergeKeyrambitOntoSilverPacket(id, x, y)) return;
        setKeyrambitItems((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
      } finally {
        if (typeof clientX === "number") {
          setTrashHover(false);
          setOrderCompleteHover(false);
        }
      }
    },
    [tryDisposeTableItemAtTrash, tryMergeKeyrambitOntoSilverPacket],
  );

  const handleWarehouseCarriedSinglePointerUp = useCallback(
    (singleId: string, clientX: number, clientY: number) => {
      if (tryCompleteOrderDrop(singleId, clientX, clientY)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      if (tryDisposeTableItemAtTrash(singleId, clientX, clientY)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      const it = singleItemsRef.current.find((s) => s.id === singleId);
      if (it && tryMergeDraggedOntoSilverPacket(singleId, it.x, it.y)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      if (it && tryMergeOrderLabelOntoBoxInPackingBag(singleId, it.x, it.y)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      if (it && tryMergeClosedPaperBoxOntoPackingBag(singleId, it.x, it.y)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      if (it && tryMergeDraggedOntoPaperBox(singleId, it.x, it.y)) {
        setTrashHover(false);
        setOrderCompleteHover(false);
        return;
      }
      setTrashHover(false);
      setOrderCompleteHover(false);
    },
    [
      tryCompleteOrderDrop,
      tryDisposeTableItemAtTrash,
      tryMergeDraggedOntoSilverPacket,
      tryMergeOrderLabelOntoBoxInPackingBag,
      tryMergeClosedPaperBoxOntoPackingBag,
      tryMergeDraggedOntoPaperBox,
    ],
  );

  const handleRejectPendingOrder = useCallback((orderId: string) => {
    setPendingOrders((prev) => {
      const next = prev.filter((x) => x.id !== orderId);
      const flat = readLocalInventory();
      while (next.length < 5) {
        next.push(generateOrder(flat));
      }
      return next;
    });
    setToastMessage("Đã từ chối đơn");
  }, []);

  const handleAcceptOrder = useCallback(
    (orderId: string) => {
      if (activeOrder != null) return;
      setPendingOrders((prev) => {
        const o = prev.find((x) => x.id === orderId);
        if (!o) return prev;
        const stock = getKeyrambitStock(o.requiredKeyrambitId, readLocalInventory());
        if (stock < o.requiredQuantity) {
          queueMicrotask(() => setToastMessage("Kho chưa đủ Keyrambit cho đơn này"));
        }
        setActiveOrder({ ...o, status: "accepted" });
        return prev.filter((x) => x.id !== orderId);
      });
    },
    [activeOrder],
  );

  const handleCancelActiveOrder = useCallback(() => {
    setActiveOrder((cur) => {
      if (!cur) return null;
      setPendingOrders((prev) => {
        const next = [...prev, { ...cur, status: "pending" as const }];
        return next.slice(0, 5);
      });
      return null;
    });
  }, []);

  const handleCompleteOrder = useCallback(() => {
    finalizeActiveOrder();
  }, [finalizeActiveOrder]);

  const handleKeyrambitDrawerDrop = useCallback(
    (row: PlayerKeyrambitInventoryItem, displaySrc: string, clientX: number, clientY: number) => {
      if (!layout) return;
      const onTable = countKeyrambitOnTableById(keyrambitItemsRef.current, row.keyrambitId);
      if (onTable >= row.quantity) return;
      const pt = clientToPackingLayoutCoords(layout, size.w, size.h, wrapRef.current, clientX, clientY);
      if (!pt) return;
      setKeyrambitWarehouseOpen(false);
      const img = displaySrc || resolveProductImage(row.name, row.imageSrc || null) || "";
      setKeyrambitItems((prev) => {
        const z = nextUserLayerZ(layout, [], singleItemsRef.current, prev);
        const { width, height } = getSingleItemSizePx("table_keyrambit");
        const id = `kr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return [
          ...prev,
          {
            type: "keyrambit" as const,
            id,
            keyrambitId: row.keyrambitId,
            name: row.name,
            imageSrc: img,
            x: pt.x - width / 2,
            y: pt.y - height / 2,
            width,
            height,
            rotation: 0,
            zIndex: z,
            rarity: row.rarity,
            series: row.series,
            quantity: 1 as const,
          },
        ];
      });
    },
    [layout, resolveProductImage, size.w, size.h],
  );

  const dismissStackUxHint = useCallback(() => {
    try {
      localStorage.setItem(PACKING_STACK_UX_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setStackUxDismissed(true);
  }, []);

  const showStackOnboarding = layoutHasWarehouseStacks && !stackUxDismissed;

  const silverSealBarRect = useMemo(() => {
    if (!silverSealSession || !layout) return null;
    void silverSealTick;
    void sealDragPulse;
    const live = liveSingleDragLayoutRef.current;
    const sRaw = singleItems.find((si) => si.id === silverSealSession.singleId);
    if (!sRaw || sRaw.groupId !== "silver_bag") return null;
    const s = live?.id === sRaw.id ? { ...sRaw, x: live.x, y: live.y } : sRaw;
    const heaters = listLayoutHeaters(layout);
    if (!silverStuffPacketFullCenterOnHeater(s, heaters)) return null;
    const barW = 140;
    const barH = 10;
    const vx = s.x + s.width / 2 - barW / 2;
    const vy = s.y - 22;
    const r = packingLayoutRectToClientViewportRect(layout, size.w, size.h, wrapRef.current, {
      x: vx,
      y: vy,
      width: barW,
      height: barH,
    });
    if (!r) return null;
    const prog = Math.min(1, (Date.now() - silverSealSession.startMs) / 1000);
    return { r, prog };
  }, [silverSealSession, layout, singleItems, size.w, size.h, silverSealTick, sealDragPulse]);

  if (!persistHydrated) {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#05070c] text-sm text-zinc-400">
        Loading…
      </main>
    );
  }

  return (
    <main className="relative isolate flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-[#05070c] text-zinc-100">
      <div ref={wrapRef} className={`relative min-h-0 min-w-0 flex-1${showMobileUi ? " pb-[5.25rem]" : ""}`}>
        {layout && !err ? (
          <>
            <PackingKonvaStage
            layout={layout}
            editMode={false}
            containerWidth={size.w}
            containerHeight={size.h}
            selectedId={null}
            cropEditAssetId={null}
            onSelectId={noopSelect}
            onAssetChange={noopChange}
            playPrinter={playPrinterForKonva}
            singleItems={singleItems}
            onSingleItemMove={handleSingleItemMove}
            onWarehouseCarriedSinglePointerUp={handleWarehouseCarriedSinglePointerUp}
            onWarehouseCarriedSinglePointerMove={syncTrashHoverFromClient}
            onSingleItemDragMoveScreen={syncSingleDragScreenHover}
            onSingleItemDragMoveLayout={handleSingleItemDragMoveLayout}
            onSingleItemTap={handleSingleItemTap}
            warehouseSinglesRemaining={singlesLeft}
            onLayoutWarehouseStackTap={handleLayoutWarehouseStackTap}
            onLayoutWarehouseDragSpawnAt={handleLayoutWarehouseDragSpawnAt}
            onLayoutWarehouseDragMoveSingle={handleLayoutWarehouseDragMoveSingle}
            onLayoutWarehousePickGestureEnd={handleLayoutWarehousePickGestureEnd}
            warehouseCarryingSingleId={warehouseCarryingSingleId}
            keyrambitItems={keyrambitItems}
            onKeyrambitItemMove={handleKeyrambitItemMove}
          />
            {silverSealBarRect ? (
              <div
                className="pointer-events-none fixed z-[55] overflow-hidden rounded-full border border-amber-400/50 bg-zinc-950/95 shadow-lg"
                style={{
                  left: silverSealBarRect.r.left,
                  top: silverSealBarRect.r.top,
                  width: silverSealBarRect.r.width,
                  height: silverSealBarRect.r.height,
                }}
              >
                <div
                  className="h-full rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                  style={{ width: `${silverSealBarRect.prog * 100}%` }}
                />
              </div>
            ) : null}
          </>
        ) : err ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            {err}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading…</div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col">
        <div className="pointer-events-auto shrink-0 space-y-2 bg-[#03040a]/55 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-zinc-600/80 bg-[#0a0f1d]/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-cyan-500/40 hover:text-cyan-100"
            >
              ← Store
            </Link>
          </div>
          <MainNavWithAuth className="!mb-0" />
        </div>
      </div>

      {stockoutMessage ? (
        <div
          className="pointer-events-none fixed left-1/2 top-[max(5.5rem,env(safe-area-inset-top)+4rem)] z-[48] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-3 text-center text-[13px] font-semibold leading-snug text-red-500 drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]"
          role="status"
        >
          {stockoutMessage}
        </div>
      ) : null}

      {toastMessage ? (
        <div
          className="pointer-events-none fixed left-1/2 top-[max(8.5rem,env(safe-area-inset-top)+7rem)] z-[52] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-[#0a0f1d]/95 px-4 py-2.5 text-center text-[12px] font-medium text-emerald-100 shadow-xl"
          role="status"
        >
          {toastMessage}
        </div>
      ) : null}

      {layout && !err ? (
        <>
          {!showMobileUi && layoutHasWarehouseStacks ? (
            <PackingDesktopBlock
              className="pointer-events-none fixed bottom-[4.75rem] left-1/2 z-[44] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-2 text-center text-[10px] leading-snug text-zinc-500"
              style={{ bottom: "max(4.75rem, calc(env(safe-area-inset-bottom) + 3.5rem))" }}
            >
              {finePointer ? (
                <>
                  <span className="block">Tap nhanh: lấy 1 đơn gần stack · Nhấn và kéo: đơn bám theo chuột đến khi thả</span>
                  <span className="block">Kéo sản phẩm đơn trên bàn để sắp xếp</span>
                </>
              ) : (
                <span>
                  Chạm nhanh = lấy đơn gần stack · Chạm giữ và kéo = đơn bám tay đến khi nhấc ngón
                </span>
              )}
            </PackingDesktopBlock>
          ) : null}
          {!showMobileUi && showStackOnboarding ? (
            <PackingDesktopBlock
              className="pointer-events-auto fixed bottom-[7.5rem] left-1/2 z-[46] w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-cyan-500/30 bg-[#0a0f1d]/95 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-200 shadow-xl backdrop-blur-md"
              style={{ bottom: "max(7.5rem, calc(env(safe-area-inset-bottom) + 5.5rem))" }}
              role="dialog"
              aria-label="Hướng dẫn stack"
            >
              <p className="text-zinc-300">
                Tap nhanh trên stack (xanh) để lấy đơn gần stack. Nhấn giữ rồi kéo ra: đơn dính theo tay/chuột
                đến khi thả. Kho chỉ hiển thị tồn.
              </p>
              <button
                type="button"
                onClick={dismissStackUxHint}
                className="mt-2 w-full rounded-lg border border-cyan-500/40 bg-cyan-500/15 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/25"
              >
                Đã hiểu
              </button>
            </PackingDesktopBlock>
          ) : null}
          {!showMobileUi ? (
            <PackingDesktopView
              className="pointer-events-auto fixed z-[50] max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
              style={{
                left: "max(1rem, env(safe-area-inset-left))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOrdersOpen(true)}
                  className="pointer-events-auto rounded-xl border border-amber-500/40 bg-[#0a0f1d]/92 px-3 py-2.5 text-[11px] font-semibold text-amber-50 shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-amber-400/55 hover:bg-[#0d1528]/95"
                >
                  Đơn hàng
                </button>
                <button
                  type="button"
                  onClick={() => setKeyrambitWarehouseOpen(true)}
                  className="pointer-events-auto rounded-xl border border-violet-500/40 bg-[#0a0f1d]/92 px-3 py-2.5 text-[11px] font-semibold text-violet-50 shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-violet-400/55 hover:bg-[#0d1528]/95"
                >
                  Kho Keyrambit
                </button>
                <button
                  type="button"
                  onClick={() => setWarehouseOpen(true)}
                  className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-[#0a0f1d]/92 px-3 py-2.5 text-[11px] font-semibold text-cyan-50 shadow-lg shadow-black/40 backdrop-blur-md transition hover:border-cyan-400/55 hover:bg-[#0d1528]/95"
                >
                  <svg
                    className="h-5 w-5 shrink-0 text-cyan-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 8h15l-1.5 9.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L6 8Z" />
                    <path d="M6 8 5 5H2" />
                    <path d="M11 12v3" />
                    <path d="M16 12v3" />
                    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                  </svg>
                  Kho Đóng Hàng
                </button>
              </div>
            </PackingDesktopView>
          ) : null}
          {showMobileUi ? (
            <PackingMobileView
              pendingOrderCount={pendingOrders.length}
              onOpenOrders={() => setOrdersOpen(true)}
              onOpenKeyrambitWarehouse={() => setKeyrambitWarehouseOpen(true)}
              onOpenPackingWarehouse={() => setWarehouseOpen(true)}
            />
          ) : null}
          <PackingWarehouseDrawer open={warehouseOpen} onClose={() => setWarehouseOpen(false)} stocks={stockRows} />
          <PackingKeyrambitWarehouseDrawer
            open={keyrambitWarehouseOpen}
            onClose={() => setKeyrambitWarehouseOpen(false)}
            rows={keyrambitWarehouseRows}
            onDragEndPlace={handleKeyrambitDrawerDrop}
          />
          <PackingOrdersDrawer
            open={ordersOpen}
            onClose={() => setOrdersOpen(false)}
            pendingOrders={pendingOrders}
            activeOrder={activeOrder}
            checklistRows={orderChecklist.rows}
            checklistAllOk={orderChecklist.allOk}
            resolveKeyrambitStock={resolveKeyrambitStock}
            onAcceptOrder={handleAcceptOrder}
            onRejectPendingOrder={handleRejectPendingOrder}
            onCompleteOrder={handleCompleteOrder}
            onCancelActiveOrder={handleCancelActiveOrder}
          />
          <div
            className={`pointer-events-none fixed z-[51] flex flex-col items-end gap-2 ${
              showMobileUi
                ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
                : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
            }`}
            style={{ right: "max(1rem, env(safe-area-inset-right))" }}
          >
            <div
              ref={orderCompleteDropRef}
              className="pointer-events-none flex flex-col items-center gap-1"
              role="region"
              aria-label="Hoàn thành đơn — kéo gói packing-bag-done vào đây khi checklist đủ"
            >
              <div
                className={`pointer-events-none flex h-auto min-h-[7.5rem] w-[4.5rem] origin-center flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center shadow-lg backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out will-change-transform sm:min-h-[8rem] sm:w-[5rem] ${
                  activeOrder && orderChecklist.allOk
                    ? orderCompleteHover
                      ? "scale-110 border-emerald-300/85 bg-emerald-950/45 shadow-[0_0_28px_rgba(52,211,153,0.45)] ring-2 ring-emerald-400/50"
                      : "scale-100 border-emerald-500/50 bg-emerald-950/28 shadow-black/40"
                    : orderCompleteHover
                      ? "scale-[1.05] border-zinc-500/65 bg-zinc-900/55 shadow-zinc-800/30"
                      : "scale-100 border-zinc-600/60 bg-zinc-800/40 shadow-black/40"
                }`}
              >
                <div className="flex flex-col items-center gap-px leading-tight">
                  <span className="text-[10px] font-bold tracking-wide text-zinc-100">Hoàn</span>
                  <span className="text-[10px] font-bold tracking-wide text-zinc-100">Thành</span>
                  <span className="text-[10px] font-bold tracking-wide text-zinc-100">Đơn</span>
                </div>
                <div className="mt-1 flex flex-col items-center gap-px border-t border-zinc-600/40 pt-1.5 leading-tight">
                  {activeOrder && orderChecklist.allOk ? (
                    <>
                      <span className="text-[7px] font-medium text-zinc-400">Kéo</span>
                      <span className="text-[7px] font-medium text-zinc-400">gói</span>
                      <span className="text-[6.5px] font-medium leading-none text-zinc-400">done</span>
                      <span className="text-[7px] font-medium text-zinc-400">vào</span>
                      <span className="text-[7px] font-medium text-zinc-400">đây</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[7px] font-medium text-zinc-400">Làm</span>
                      <span className="text-[7px] font-medium text-zinc-400">đủ</span>
                      <span className="text-[6.5px] font-medium leading-snug text-zinc-400">checklist</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div
              ref={trashDropRef}
              className="pointer-events-none flex flex-col items-center gap-1"
              role="region"
              aria-label="Thùng rác — kéo sản phẩm đơn vào đây để bỏ và trả kho"
            >
              <div
                className={`pointer-events-none flex h-[4.5rem] w-[4.5rem] origin-center flex-col items-center justify-center rounded-2xl border bg-[#0a0f1d]/92 shadow-lg backdrop-blur-md transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform sm:h-[5rem] sm:w-[5rem] ${
                  trashHover
                    ? "scale-[1.14] border-rose-400/75 shadow-rose-950/45"
                    : "scale-100 border-rose-500/35 shadow-black/40"
                }`}
              >
                <svg
                  className="h-8 w-8 text-rose-400/95 sm:h-9 sm:w-9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-200/90">Thùng rác</span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
