"use client";

import { useAuth } from "../contexts/AuthContext";

export function AuthToolbar() {
  const { supabaseEnabled, loading, user, signInWithGoogle, signOut } = useAuth();

  if (!supabaseEnabled) return null;

  return (
    <div className="border-b border-zinc-800/80 bg-[#070a14]/95 px-4 py-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
        {loading ? (
          <span className="text-xs text-zinc-500">Đang tải…</span>
        ) : user ? (
          <>
            <span className="max-w-[14rem] truncate text-xs text-zinc-400" title={user.email ?? ""}>
              {user.email ?? user.id}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-zinc-600 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            Đăng nhập bằng Google
          </button>
        )}
      </div>
    </div>
  );
}
