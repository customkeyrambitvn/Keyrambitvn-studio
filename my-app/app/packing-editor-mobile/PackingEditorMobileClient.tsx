"use client";

import { PACKING_LAYOUT_MOBILE_DEFAULT_URL } from "@/lib/packing-layout";
import PackingEditorClient from "../packing-editor/PackingEditorClient";

export default function PackingEditorMobileClient() {
  return <PackingEditorClient editorVariant="mobile" defaultLayoutUrl={PACKING_LAYOUT_MOBILE_DEFAULT_URL} />;
}
