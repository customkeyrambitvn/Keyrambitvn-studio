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
          className="store-btn store-btn--secondary store-btn--sm cursor-not-allowed opacity-60"
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
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--store-accent-muted)]">
          Đang tải…
        </span>
      ) : user ? (
        <div className="flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg-panel)] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:gap-2">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-[var(--store-border-strong)] object-cover sm:h-9 sm:w-9"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--store-border-strong)] bg-[var(--store-accent-soft)] text-[11px] font-bold text-[#f5e6b8] sm:h-9 sm:w-9 sm:text-xs"
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
          <button type="button" onClick={() => void signOut()} className="store-btn store-btn--ghost store-btn--sm shrink-0">
            Đăng xuất
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void signInWithGoogle()} className="store-btn store-btn--primary store-btn--sm whitespace-nowrap">
          Đăng nhập Google
        </button>
      )}
    </div>
  );
}
