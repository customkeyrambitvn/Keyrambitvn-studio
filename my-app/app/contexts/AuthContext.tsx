"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_INVENTORY_TITLE,
  INVENTORY_CHANGED_EVENT,
  mergeGuestIntoAccount,
  readLocalInventory,
  readLocalInventoryTitle,
  writeLocalInventory,
  writeLocalInventoryTitle,
  type InventoryItem,
} from "../../lib/inventory-local";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase/browser-client";
import { fetchUserInventory, upsertUserInventory } from "../../lib/supabase/inventory-remote";

function guestHasUnsyncedItems(guest: InventoryItem[], cloud: InventoryItem[]): boolean {
  if (guest.length === 0) return false;
  if (cloud.length === 0) return true;
  const cloudIds = new Set(cloud.map((c) => c.id));
  return guest.some((g) => !cloudIds.has(g.id));
}

type MergeState = {
  guest: InventoryItem[];
  cloudItems: InventoryItem[];
  cloudTitle: string;
};

type AuthContextValue = {
  supabaseEnabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  cloudPersist: (items: InventoryItem[], title?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergeState, setMergeState] = useState<MergeState | null>(null);

  const applyCloudToLocal = useCallback((cloudItems: InventoryItem[], cloudTitle: string) => {
    writeLocalInventory(cloudItems);
    writeLocalInventoryTitle(cloudTitle);
    window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
  }, []);

  const handlePostSignIn = useCallback(
    async (user: User) => {
      if (!supabase) return;
      const guest = readLocalInventory();
      const remote = await fetchUserInventory(supabase, user.id);
      const cloudItems = remote?.items ?? [];
      const cloudTitle =
        remote?.title && remote.title.trim() ? remote.title.trim() : DEFAULT_INVENTORY_TITLE;

      if (guestHasUnsyncedItems(guest, cloudItems)) {
        setMergeState({ guest, cloudItems, cloudTitle });
        return;
      }

      if (cloudItems.length > 0) {
        applyCloudToLocal(cloudItems, cloudTitle);
      } else if (guest.length > 0) {
        await upsertUserInventory(supabase, user.id, guest, readLocalInventoryTitle());
      }
    },
    [supabase, applyCloudToLocal]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setLoading(false);

      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
      if (!s?.user) return;
      await handlePostSignIn(s.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase, handlePostSignIn]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setMergeState(null);
    await supabase.auth.signOut();
  }, [supabase]);

  const cloudPersist = useCallback(
    async (items: InventoryItem[], title?: string) => {
      if (!supabase || !session?.user) return;
      const t = title ?? readLocalInventoryTitle();
      await upsertUserInventory(supabase, session.user.id, items, t);
    },
    [supabase, session?.user?.id]
  );

  const resolveMerge = useCallback(
    async (mode: "merge" | "cloud") => {
      if (!supabase || !session?.user || !mergeState) return;
      const { guest, cloudItems, cloudTitle } = mergeState;
      let items: InventoryItem[];
      let title: string;
      if (mode === "merge") {
        items = mergeGuestIntoAccount(guest, cloudItems);
        title = readLocalInventoryTitle();
      } else {
        items = cloudItems;
        title = cloudTitle;
      }
      writeLocalInventory(items);
      writeLocalInventoryTitle(title);
      await upsertUserInventory(supabase, session.user.id, items, title);
      setMergeState(null);
      window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
    },
    [supabase, session?.user?.id, mergeState]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      supabaseEnabled: isSupabaseConfigured(),
      loading,
      user: session?.user ?? null,
      session,
      signInWithGoogle,
      signOut,
      cloudPersist,
    }),
    [loading, session, signInWithGoogle, signOut, cloudPersist]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {mergeState && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#03040a]/85 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-guest-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/35 bg-[#0b1020]/95 p-5 shadow-[0_0_48px_rgba(34,211,238,0.15)]">
            <h2 id="merge-guest-title" className="text-lg font-semibold text-zinc-100">
              Đồng bộ kho cục bộ
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Bạn có <strong className="text-cyan-300">{mergeState.guest.length}</strong> vật phẩm trên thiết bị chưa có
              trên tài khoản. Gộp vào tài khoản Google hay chỉ dùng kho đám mây?
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void resolveMerge("cloud")}
                className="rounded-lg border border-zinc-600 bg-zinc-900/70 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Chỉ dùng đám mây
              </button>
              <button
                type="button"
                onClick={() => void resolveMerge("merge")}
                className="rounded-lg border border-cyan-500/70 bg-cyan-950/40 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-400 hover:bg-cyan-950/60"
              >
                Đồng bộ lên tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
