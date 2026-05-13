import type { PackingOrder } from "./packing-orders-types";
import { keyrambitIdFromName } from "./packing-keyrambit-id";

const k1 = "Keyrambit S1 Trắng";
const k2 = "Keyrambit S1 Đen";
const k3 = "Keyrambit Pokemon Solgaleo";

/** Tối đa 5 đơn pending — mock, sau này nối backend. */
export const MOCK_PACKING_ORDER_QUEUE: PackingOrder[] = [
  {
    id: "ord-mock-1",
    customerName: "Anh Tuấn",
    requiredKeyrambitId: keyrambitIdFromName(k1),
    requiredKeyrambitName: k1,
    requiredQuantity: 1,
    requiredPackagingItems: [
      { itemId: "shipping_bag", name: "Túi đóng hàng", quantity: 1 },
      { itemId: "paper_box", name: "Hộp giấy", quantity: 1 },
      { itemId: "thank_you_card", name: "Thẻ cảm ơn", quantity: 1 },
      { itemId: "keychain_ring", name: "Khoen khóa", quantity: 1 },
    ],
    status: "pending",
  },
  {
    id: "ord-mock-2",
    customerName: "Chị Lan",
    requiredKeyrambitId: keyrambitIdFromName(k2),
    requiredKeyrambitName: k2,
    requiredQuantity: 2,
    requiredPackagingItems: [
      { itemId: "paper_box", name: "Hộp giấy", quantity: 1 },
      { itemId: "thank_you_card", name: "Thẻ cảm ơn", quantity: 1 },
      { itemId: "silver_sealed_bag", name: "Túi bạc niêm phong", quantity: 1 },
    ],
    status: "pending",
  },
  {
    id: "ord-mock-3",
    customerName: "Bạn Minh",
    requiredKeyrambitId: keyrambitIdFromName(k3),
    requiredKeyrambitName: k3,
    requiredQuantity: 1,
    requiredPackagingItems: [
      { itemId: "shipping_bag", name: "Túi đóng hàng", quantity: 1 },
      { itemId: "paper_box", name: "Hộp giấy", quantity: 1 },
      { itemId: "thank_you_card", name: "Thẻ cảm ơn", quantity: 1 },
    ],
    status: "pending",
  },
  {
    id: "ord-mock-4",
    customerName: "Shop ABC",
    requiredKeyrambitId: keyrambitIdFromName(k1),
    requiredKeyrambitName: k1,
    requiredQuantity: 1,
    requiredPackagingItems: [
      { itemId: "paper_box", name: "Hộp giấy", quantity: 1 },
      { itemId: "silica_gel", name: "Gói hút ẩm", quantity: 1 },
    ],
    status: "pending",
  },
  {
    id: "ord-mock-5",
    customerName: "Khách lẻ",
    requiredKeyrambitId: keyrambitIdFromName(k2),
    requiredKeyrambitName: k2,
    requiredQuantity: 1,
    requiredPackagingItems: [
      { itemId: "shipping_bag", name: "Túi đóng hàng", quantity: 1 },
      { itemId: "thank_you_card", name: "Thẻ cảm ơn", quantity: 1 },
    ],
    status: "pending",
  },
];
