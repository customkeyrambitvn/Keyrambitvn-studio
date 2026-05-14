"use client";

import dynamic from "next/dynamic";

const PackingEditorMobileClient = dynamic(() => import("./PackingEditorMobileClient"), { ssr: false });

export default function PackingEditorMobileGate() {
  return <PackingEditorMobileClient />;
}
