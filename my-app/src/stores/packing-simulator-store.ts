import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PackingOrder } from "@/lib/packing-orders-types";
import type { PackingLayout } from "@/lib/packing-layout";
import {
  createDefaultSinglesLeftMap,
  type PackingTableKeyrambitItem,
  type PackingTableSingleItem,
} from "@/lib/packing-warehouse";

const STORAGE_KEY = "keyrambit-packing-simulator-v1";

export type PackingSimulatorPersistedState = {
  layout: PackingLayout | null;
  singlesLeft: Record<string, number>;
  singleItems: PackingTableSingleItem[];
  keyrambitItems: PackingTableKeyrambitItem[];
  pendingOrders: PackingOrder[];
  activeOrder: PackingOrder | null;
  stackUxDismissed: boolean;
};

type PackingSimulatorStore = PackingSimulatorPersistedState & {
  setLayout: (v: PackingLayout | null | ((prev: PackingLayout | null) => PackingLayout | null)) => void;
  setSinglesLeft: (v: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setSingleItems: (v: PackingTableSingleItem[] | ((prev: PackingTableSingleItem[]) => PackingTableSingleItem[])) => void;
  setKeyrambitItems: (
    v: PackingTableKeyrambitItem[] | ((prev: PackingTableKeyrambitItem[]) => PackingTableKeyrambitItem[]),
  ) => void;
  setPendingOrders: (v: PackingOrder[] | ((prev: PackingOrder[]) => PackingOrder[])) => void;
  setActiveOrder: (v: PackingOrder | null | ((prev: PackingOrder | null) => PackingOrder | null)) => void;
  setStackUxDismissed: (v: boolean | ((prev: boolean) => boolean)) => void;
  /** Xóa session đóng hàng (reload / nút reset sau này). */
  resetPackingSession: () => void;
};

const emptyPersist: PackingSimulatorPersistedState = {
  layout: null,
  singlesLeft: createDefaultSinglesLeftMap(),
  singleItems: [],
  keyrambitItems: [],
  pendingOrders: [],
  activeOrder: null,
  stackUxDismissed: false,
};

export const usePackingSimulatorStore = create<PackingSimulatorStore>()(
  persist(
    (set) => ({
      ...emptyPersist,
      setLayout: (v) =>
        set((s) => ({ layout: typeof v === "function" ? (v as (p: PackingLayout | null) => PackingLayout | null)(s.layout) : v })),
      setSinglesLeft: (v) =>
        set((s) => ({
          singlesLeft: typeof v === "function" ? (v as (p: Record<string, number>) => Record<string, number>)(s.singlesLeft) : v,
        })),
      setSingleItems: (v) =>
        set((s) => ({
          singleItems: typeof v === "function" ? (v as (p: PackingTableSingleItem[]) => PackingTableSingleItem[])(s.singleItems) : v,
        })),
      setKeyrambitItems: (v) =>
        set((s) => ({
          keyrambitItems: typeof v === "function" ? (v as (p: PackingTableKeyrambitItem[]) => PackingTableKeyrambitItem[])(s.keyrambitItems) : v,
        })),
      setPendingOrders: (v) =>
        set((s) => ({
          pendingOrders: typeof v === "function" ? (v as (p: PackingOrder[]) => PackingOrder[])(s.pendingOrders) : v,
        })),
      setActiveOrder: (v) =>
        set((s) => ({
          activeOrder: typeof v === "function" ? (v as (p: PackingOrder | null) => PackingOrder | null)(s.activeOrder) : v,
        })),
      setStackUxDismissed: (v) =>
        set((s) => ({
          stackUxDismissed: typeof v === "function" ? (v as (p: boolean) => boolean)(s.stackUxDismissed) : v,
        })),
      resetPackingSession: () =>
        set((s) => ({
          ...s,
          singlesLeft: createDefaultSinglesLeftMap(),
          singleItems: [],
          keyrambitItems: [],
          pendingOrders: [],
          activeOrder: null,
          stackUxDismissed: false,
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PackingSimulatorPersistedState => ({
        layout: s.layout,
        singlesLeft: s.singlesLeft,
        singleItems: s.singleItems,
        keyrambitItems: s.keyrambitItems,
        pendingOrders: s.pendingOrders,
        activeOrder: s.activeOrder,
        stackUxDismissed: s.stackUxDismissed,
      }),
    },
  ),
);
