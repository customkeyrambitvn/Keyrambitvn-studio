"use client";

import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  readLocalInventory,
  readLocalInventoryTitle,
  writeLocalInventory,
  writeLocalInventoryTitle,
  type InventoryItem,
} from "../../lib/inventory-local";

export function useInventoryPersist() {
  const { cloudPersist } = useAuth();

  const saveInventory = useCallback(
    (items: InventoryItem[]) => {
      writeLocalInventory(items);
      void cloudPersist(items);
    },
    [cloudPersist]
  );

  const saveInventoryTitle = useCallback(
    (title: string) => {
      writeLocalInventoryTitle(title);
      void cloudPersist(readLocalInventory(), title);
    },
    [cloudPersist]
  );

  return {
    saveInventory,
    saveInventoryTitle,
    readLocalInventory,
    readLocalInventoryTitle,
  };
}
