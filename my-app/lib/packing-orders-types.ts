export type PackingOrderStatus = "pending" | "accepted" | "packed" | "completed";

export type PackingOrderPackagingLine = {
  itemId: string;
  name: string;
  quantity: number;
};

export type PackingOrder = {
  id: string;
  customerName: string;
  requiredKeyrambitId: string;
  requiredKeyrambitName: string;
  requiredQuantity: number;
  requiredPackagingItems: PackingOrderPackagingLine[];
  status: PackingOrderStatus;
};

export type PlayerKeyrambitInventoryItem = {
  keyrambitId: string;
  name: string;
  imageSrc: string;
  quantity: number;
  rarity: string;
  series: string;
};
