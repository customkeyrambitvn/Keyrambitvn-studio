import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryItem } from "../inventory-local";

export type RemoteInventoryPayload = {
  items: InventoryItem[];
  title: string;
};

export async function fetchUserInventory(
  client: SupabaseClient,
  userId: string
): Promise<RemoteInventoryPayload | null> {
  const { data, error } = await client
    .from("user_inventories")
    .select("items, title")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchUserInventory", error.message);
    return null;
  }
  if (!data) return null;

  const raw = data.items as unknown;
  const items = Array.isArray(raw) ? (raw as InventoryItem[]) : [];
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "";

  return { items, title };
}

export async function upsertUserInventory(
  client: SupabaseClient,
  userId: string,
  items: InventoryItem[],
  title: string
): Promise<boolean> {
  const { error } = await client.from("user_inventories").upsert(
    {
      user_id: userId,
      items: items as unknown as Record<string, unknown>[],
      title,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("upsertUserInventory", error.message);
    return false;
  }
  return true;
}
