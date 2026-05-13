import { notFound } from "next/navigation";
import { isPackingEditorEnabled } from "@/lib/packing-layout";
import PackingEditorGate from "./PackingEditorGate";

/** Evaluate env per request so `VITE_ENABLE_PACKING_EDITOR` (server) can toggle without rebuild. */
export const dynamic = "force-dynamic";

export default function PackingEditorPage() {
  if (!isPackingEditorEnabled()) notFound();
  return <PackingEditorGate />;
}
