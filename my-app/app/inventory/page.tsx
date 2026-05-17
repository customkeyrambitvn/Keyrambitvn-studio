"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  InventoryArmory,
  InventoryCompactTopNav,
  InventoryHintBar,
  InventoryTitleBar,
} from "../components/inventory";
import { StoreButton, StoreModal, StoreShell } from "../components/store";
import { useInventoryPersist } from "../hooks/useInventoryPersist";
import {
  DEFAULT_INVENTORY_TITLE,
  INVENTORY_CHANGED_EVENT,
  readLocalInventory,
  readLocalInventoryTitle,
} from "../../lib/inventory-local";

type Rarity = "Thường" | "Hiếm" | "Siêu Hiếm" | "Combo" | "Săn Lùng" | "Secret" | "Rare Secret" | "Super Secret";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

const RARITY_ORDER: Rarity[] = ["Thường", "Hiếm", "Siêu Hiếm", "Combo", "Săn Lùng", "Secret", "Rare Secret", "Super Secret"];

function normalizeRarity(rawRarity: string): Rarity {
  const value = rawRarity.trim();
  const aliasMap: Record<string, Rarity> = {
    "Thường": "Thường",
    "Hiếm": "Hiếm",
    "Siêu Hiếm": "Siêu Hiếm",
    "Combo": "Combo",
    "Săn Lùng": "Săn Lùng",
    "Secret": "Secret",
    "Rare Secret": "Rare Secret",
    "Super Secret": "Super Secret",
  };
  return aliasMap[value] ?? "Thường";
}

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

export default function InventoryPage() {
  const { saveInventory, saveInventoryTitle } = useInventoryPersist();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryTitle, setInventoryTitle] = useState(DEFAULT_INVENTORY_TITLE);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      setItems(readLocalInventory());
      setInventoryTitle(readLocalInventoryTitle());
    };
    refresh();
    window.addEventListener(INVENTORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(INVENTORY_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!showClearConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowClearConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showClearConfirm]);

  const commitInventoryTitle = () => {
    const next = titleDraft.trim() === "" ? DEFAULT_INVENTORY_TITLE : titleDraft.trim();
    saveInventoryTitle(next);
    setInventoryTitle(next);
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setTitleDraft(inventoryTitle);
    setIsEditingTitle(false);
  };

  const startEditTitle = () => {
    setTitleDraft(inventoryTitle);
    setIsEditingTitle(true);
  };

  const confirmClearInventory = () => {
    saveInventory([]);
    setItems([]);
    setShowClearConfirm(false);
  };

  const rarityCounts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const normalized = normalizeRarity(item.rarity);
        acc[normalized] += 1;
        return acc;
      },
      {
        "Thường": 0,
        "Hiếm": 0,
        "Siêu Hiếm": 0,
        "Combo": 0,
        "Săn Lùng": 0,
        "Secret": 0,
        "Rare Secret": 0,
        "Super Secret": 0,
      } as Record<Rarity, number>
    );
  }, [items]);

  return (
    <StoreShell contentClassName="app-page--compact inventory-page flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="inventory-page__chrome shrink-0">
        <InventoryCompactTopNav />
      </div>

      <div className="inventory-page__workspace">
        <InventoryTitleBar
          inventoryTitle={inventoryTitle}
          isEditingTitle={isEditingTitle}
          titleDraft={titleDraft}
          titleInputRef={titleInputRef}
          onTitleDraftChange={setTitleDraft}
          onCommitTitle={commitInventoryTitle}
          onCancelEdit={cancelEditTitle}
          onStartEdit={startEditTitle}
          onClearInventory={() => setShowClearConfirm(true)}
        />

        <div className="inventory-page__body">
          {items.length === 0 ? (
            <div className="store-empty">
              Chưa có vật phẩm nào. Mở thêm blind box để xây dựng kho đồ.
            </div>
          ) : (
            <>
              <InventoryArmory
                items={items}
                rarityOrder={RARITY_ORDER}
                rarityCounts={rarityCounts}
                normalizeRarity={(raw) => normalizeRarity(raw)}
                rarityToClassName={(r) => rarityToClassName(r as Rarity)}
              />
              <InventoryHintBar />
            </>
          )}
        </div>
      </div>

      <StoreModal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} titleId="clear-inventory-title">
        <p id="clear-inventory-title" className="text-sm leading-relaxed text-zinc-200">
          Bạn có chắc muốn xóa toàn bộ vật phẩm trong kho không? Hành động này không thể hoàn tác.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <StoreButton type="button" variant="secondary" onClick={() => setShowClearConfirm(false)}>
            Hủy
          </StoreButton>
          <StoreButton type="button" variant="danger" onClick={confirmClearInventory}>
            Xác nhận xóa
          </StoreButton>
        </div>
      </StoreModal>
    </StoreShell>
  );
}
