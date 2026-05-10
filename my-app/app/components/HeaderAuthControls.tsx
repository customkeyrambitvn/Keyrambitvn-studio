"use client";

import type { User } from "@supabase/supabase-js";
import { useAuth } from "../contexts/AuthContext";

function userAvatarUrl(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  const a = m?.avatar_url;
  const p = m?.picture;
  if (typeof a === "string" && a.length > 0) return a;
  if (typeof p === "string" && p.length > 0) return p;
  return null;
}

/** Compact Google auth for the main header row (desktop + mobile). */
export function HeaderAuthControls() {
  const { supabaseEnabled, loading, user, signInWithGoogle, signOut } = useAuth();
  const avatarSrc = user ? userAvatarUrl(user) : null;

  if (!supabaseEnabled) {
    return (
      <div className="flex max-w-full flex-col items-end gap-1 sm:items-end">
        <button
          type="button"
          disabled
          title="Thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY vào .env.local rồi chạy lại dev server."
          className="cursor-not-allowed whitespace-nowrap rounded-xl border border-zinc-600/80 bg-zinc-900/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 opacity-90 sm:px-4 sm:text-xs"
        >
          Đăng nhập Google
        </button>
        <span className="max-w-[14rem] text-right text-[10px] leading-snug text-zinc-500 sm:max-w-xs">
          Chưa cấu hình Supabase (thiếu biến môi trường).
        </span>
      </div>
    );
  }

  return (
    <div className="flex max-w-full items-center justify-end gap-2 sm:gap-3">
      {loading ? (
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-500/70">
          Đang tải…
        </span>
      ) : user ? (
        <div className="flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-[#0b1020]/80 px-2 py-1.5 shadow-[0_0_20px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] sm:gap-2">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-cyan-400/40 object-cover shadow-[0_0_12px_rgba(34,211,238,0.25)] sm:h-9 sm:w-9"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/15 text-[11px] font-bold text-cyan-200 shadow-[0_0_12px_rgba(192,38,211,0.2)] sm:h-9 sm:w-9 sm:text-xs"
              aria-hidden
            >
              {(user.email ?? user.id).slice(0, 1).toUpperCase()}
            </div>
          )}
          <span
            className="min-w-0 max-w-[min(52vw,14rem)] truncate text-[11px] text-zinc-300 sm:max-w-[200px] sm:text-xs"
            title={user.email ?? ""}
          >
            {user.email ?? user.id}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200 shadow-[0_0_14px_rgba(192,38,211,0.12)] transition hover:border-fuchsia-400/70 hover:bg-fuchsia-500/20 hover:text-white sm:px-3 sm:text-[11px]"
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="whitespace-nowrap rounded-xl border border-cyan-400/55 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-300 hover:from-cyan-500/25 hover:to-blue-600/15 hover:shadow-[0_0_28px_rgba(34,211,238,0.28)] sm:px-4 sm:text-xs sm:tracking-[0.12em]"
        >
          Đăng nhập Google
        </button>
      )}
    </div>
  );
}
