import { notFound } from "next/navigation";
import { isPackingEditorEnabled } from "@/lib/packing-layout";
import PackingEditorMobileGate from "./PackingEditorMobileGate";

/** Evaluate env per request so server toggle works without rebuild. */
export const dynamic = "force-dynamic";

export default function PackingEditorMobilePage() {
  if (!isPackingEditorEnabled()) notFound();
  return <PackingEditorMobileGate />;
}
