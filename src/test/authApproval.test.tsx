import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Data fixtures the fake Supabase client answers with. Each test mutates these
 * before calling signIn().
 */
const { db, signOut, toast } = vi.hoisted(() => ({
  db: {
    user_roles: [] as { user_id: string; role: string }[],
    venues: [] as { owner_id: string; approval_status: string }[],
    profiles: [] as { user_id: string; approval_status: string }[],
  },
  signOut: vi.fn().mockResolvedValue({ error: null }),
  toast: vi.fn(),
}));

const signInState = vi.hoisted(() => ({
  current: {
    data: { user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" } as unknown },
    error: null as unknown,
  },
}));

const makeQuery = (table: keyof typeof db) => {
  const filters: [string, unknown][] = [];
  const run = () => {
    const rows = (db[table] as Record<string, unknown>[]).filter((row) =>
      filters.every(([col, val]) => row[col] === val),
    );
    return Promise.resolve({ data: rows, error: null });
  };
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return builder;
    },
    maybeSingle: async () => {
      const { data } = await run();
      return { data: data[0] ?? null, error: null };
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      run().then(resolve, reject),
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: keyof typeof db) => makeQuery(table),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => signInState.current,
      signOut,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ toast }));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const renderAuth = async () => {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe("AuthContext sign-in approval gating", () => {
  beforeEach(() => {
    db.user_roles = [];
    db.venues = [];
    db.profiles = [];
    signOut.mockClear();
    toast.mockClear();
    signInState.current = {
      data: { user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" } },
      error: null,
    };
  });

  it("rejects sign-in when the email is not confirmed", async () => {
    signInState.current = { data: { user: { id: "u1", email_confirmed_at: null } }, error: null };
    const { result } = await renderAuth();

    let res: { error: { message?: string } | null } = { error: null };
    await act(async () => {
      res = await result.current.signIn("a@b.com", "pw");
    });

    expect(res.error?.message).toMatch(/verify your email/i);
    expect(signOut).toHaveBeenCalled();
  });

  it("lets an admin through without an approval row", async () => {
    db.user_roles = [{ user_id: "u1", role: "admin" }];
    const { result } = await renderAuth();

    let res: { error: unknown } = { error: "unset" };
    await act(async () => {
      res = await result.current.signIn("a@b.com", "pw");
    });

    expect(res.error).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.role).toBe("admin"));
  });

  it("blocks a venue owner whose venue is still pending", async () => {
    db.user_roles = [{ user_id: "u1", role: "venue" }];
    db.venues = [{ owner_id: "u1", approval_status: "pending" }];
    const { result } = await renderAuth();

    let res: { error: { message?: string } | null } = { error: null };
    await act(async () => {
      res = await result.current.signIn("a@b.com", "pw");
    });

    expect(res.error?.message).toMatch(/pending admin approval/i);
    expect(signOut).toHaveBeenCalled();
  });

  it("blocks a rejected influencer with the rejection message", async () => {
    db.user_roles = [{ user_id: "u1", role: "influencer" }];
    db.profiles = [{ user_id: "u1", approval_status: "rejected" }];
    const { result } = await renderAuth();

    let res: { error: { message?: string } | null } = { error: null };
    await act(async () => {
      res = await result.current.signIn("a@b.com", "pw");
    });

    expect(res.error?.message).toMatch(/rejected/i);
    expect(signOut).toHaveBeenCalled();
  });

  it("signs in an approved influencer and resolves their role", async () => {
    db.user_roles = [{ user_id: "u1", role: "influencer" }];
    db.profiles = [{ user_id: "u1", approval_status: "approved" }];
    const { result } = await renderAuth();

    let res: { error: unknown } = { error: "unset" };
    await act(async () => {
      res = await result.current.signIn("a@b.com", "pw");
    });

    expect(res.error).toBeNull();
    await waitFor(() => expect(result.current.role).toBe("influencer"));
  });

  it("prefers the admin role when a user holds several roles", async () => {
    db.user_roles = [
      { user_id: "u1", role: "influencer" },
      { user_id: "u1", role: "admin" },
    ];
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    await waitFor(() => expect(result.current.role).toBe("admin"));
  });
});
