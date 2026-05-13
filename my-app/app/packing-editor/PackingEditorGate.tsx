"use client";

import dynamic from "next/dynamic";

const PackingEditorClient = dynamic(() => import("./PackingEditorClient"), { ssr: false });

export default function PackingEditorGate() {
  return <PackingEditorClient />;
}
