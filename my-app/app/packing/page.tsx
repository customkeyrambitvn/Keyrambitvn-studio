"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const PackingPlayerClient = dynamic(() => import("./PackingPlayerClient"), { ssr: false });

export default function PackingPage() {
  return (
    <Suspense fallback={null}>
      <PackingPlayerClient />
    </Suspense>
  );
}
