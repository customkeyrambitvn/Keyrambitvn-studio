"use client";

import type { RefObject } from "react";
import { StoreButton } from "../store";

type InventoryTitleBarProps = {
  inventoryTitle: string;
  isEditingTitle: boolean;
  titleDraft: string;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onTitleDraftChange: (value: string) => void;
  onCommitTitle: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onClearInventory: () => void;
};

/** Compact one-line collection header inside the inventory workspace. */
export function InventoryTitleBar({
  inventoryTitle,
  isEditingTitle,
  titleDraft,
  titleInputRef,
  onTitleDraftChange,
  onCommitTitle,
  onCancelEdit,
  onStartEdit,
  onClearInventory,
}: InventoryTitleBarProps) {
  return (
    <div className="inventory-title-bar">
      <div className="inventory-title-bar__left min-w-0">
        <p className="inventory-title-bar__kicker">Kho Keyrambit</p>
        {isEditingTitle ? (
          <div className="inventory-title-bar__edit-row">
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              onChange={(e) => onTitleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitTitle();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="inventory-title-bar__input"
              aria-label="Tên kho"
            />
            <StoreButton type="button" size="sm" onClick={onCommitTitle}>
              Lưu
            </StoreButton>
            <StoreButton type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
              Hủy
            </StoreButton>
          </div>
        ) : (
          <div className="inventory-title-bar__title-row">
            <h1 className="inventory-title-bar__title">{inventoryTitle}</h1>
            <StoreButton type="button" variant="ghost" size="sm" onClick={onStartEdit}>
              Sửa
            </StoreButton>
          </div>
        )}
      </div>

      <div className="inventory-title-bar__actions">
        <StoreButton href="/" variant="secondary" size="sm">
          Mở box
        </StoreButton>
        <StoreButton type="button" variant="danger" size="sm" onClick={onClearInventory}>
          Xóa toàn bộ kho
        </StoreButton>
      </div>
    </div>
  );
}
