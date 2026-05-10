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

export function AuthToolbar() {
  const { supabaseEnabled, loading, user, signInWithGoogle, signOut } = useAuth();
  const avatarSrc = user ? userAvatarUrl(user) : null;

  if (!supabaseEnabled) return null;

  return (
    <div className="relative border-b border-cyan-500/20 bg-gradient-to-r from-[#050814]/98 via-[#0a1020]/98 to-[#050814]/98 px-4 py-2.5 shadow-[0_0_24px_rgba(34,211,238,0.06)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" aria-hidden />
      <div className="mx-auto flex max-w-[90rem] items-center justify-end gap-3">
        {loading ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-500/70">Đang tải…</span>
        ) : user ? (
          <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-cyan-500/25 bg-[#0b1020]/80 px-2 py-1.5 shadow-[0_0_20px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] sm:gap-3">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-cyan-400/40 object-cover shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/15 text-xs font-bold text-cyan-200 shadow-[0_0_12px_rgba(192,38,211,0.2)]"
                aria-hidden
              >
                {(user.email ?? user.id).slice(0, 1).toUpperCase()}
              </div>
            )}
            <span
              className="min-w-0 max-w-[42vw] truncate text-xs text-zinc-300 sm:max-w-[280px]"
              title={user.email ?? ""}
            >
              {user.email ?? user.id}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="shrink-0 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-200 shadow-[0_0_14px_rgba(192,38,211,0.12)] transition hover:border-fuchsia-400/70 hover:bg-fuchsia-500/20 hover:text-white"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-xl border border-cyan-400/55 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-300 hover:from-cyan-500/25 hover:to-blue-600/15 hover:shadow-[0_0_28px_rgba(34,211,238,0.28)]"
          >
            Đăng nhập Google
          </button>
        )}
      </div>
    </div>
  );
}
