"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser-client";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Đang đăng nhập…");

  useEffect(() => {
    const code = searchParams.get("code");
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase.");
      router.replace("/");
      return;
    }

    if (!code) {
      router.replace("/");
      return;
    }

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setMessage(error.message);
        router.replace("/");
        return;
      }
      router.replace("/");
    });
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06070f] text-zinc-300">
      <p className="text-sm">{message}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#06070f] text-zinc-300">
          <p className="text-sm">Đang tải…</p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
