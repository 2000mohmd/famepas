import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "admin" | "venue" | "influencer" | null;


interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  // Set while signIn() runs so the auth listener doesn't repeat the approval check.
  const [passwordFlowInFlight, setPasswordFlowInFlight] = useState(false);

  const fetchRole = async (userId: string): Promise<{ role: UserRole; error?: string }> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("fetchRole failed", error);
      return { role: null, error: error.message };
    }
    const roles = (data?.map((row) => row.role) ?? []) as UserRole[];
    const nextRole = roles.includes("admin") ? "admin" : roles.includes("venue") ? "venue" : roles.includes("influencer") ? "influencer" : null;
    setRole(nextRole);
    return { role: nextRole };
  };

  const checkApproved = async (userId: string): Promise<{ ok: boolean; status?: string; error?: string }> => {
    const { data: roleRows, error: roleErr } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (roleErr) {
      console.error("checkApproved: role lookup failed", roleErr);
      return { ok: false, error: "We couldn't verify your account. Please try again." };
    }
    const roles = (roleRows?.map((row) => row.role) ?? []) as UserRole[];
    if (roles.includes("admin")) return { ok: true };
    if (roles.includes("venue")) {
      const { data: venues, error: venueErr } = await supabase.from("venues").select("approval_status").eq("owner_id", userId);
      if (venueErr) {
        console.error("checkApproved: venue lookup failed", venueErr);
        return { ok: false, error: "We couldn't verify your account. Please try again." };
      }
      if (venues && venues.length > 0) {
        if (venues.some((v: any) => v.approval_status === "approved")) return { ok: true };
        if (venues.every((v: any) => v.approval_status === "rejected")) return { ok: false, status: "rejected" };
        return { ok: false, status: "pending" };
      }
    }
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("approval_status").eq("user_id", userId).maybeSingle();
    if (profileErr) {
      console.error("checkApproved: profile lookup failed", profileErr);
      return { ok: false, error: "We couldn't verify your account. Please try again." };
    }
    if (profile?.approval_status === "approved") return { ok: true };
    if (!profile) return { ok: false, status: "missing" };
    return { ok: false, status: profile.approval_status ?? "pending" };
  };

  /** Retries with backoff while the post-signup rows are still being created (OAuth). */
  const checkApprovedWithRetry = async (userId: string) => {
    const delays = [0, 300, 700, 1500, 2500];
    let last = await checkApproved(userId);
    for (let i = 1; i < delays.length && !last.ok && (last.status === "missing" || last.error); i++) {
      await new Promise((r) => setTimeout(r, delays[i]));
      last = await checkApproved(userId);
    }
    return last;
  };

  const enforceApproval = async (sess: Session): Promise<boolean> => {
    if (!sess.user.email_confirmed_at) {
      await supabase.auth.signOut();
      toast({ title: "Email not verified", description: "Please verify your email before signing in.", variant: "destructive" });
      return false;
    }
    const res = await checkApprovedWithRetry(sess.user.id);
    if (!res.ok) {
      await supabase.auth.signOut();
      toast({
        title: res.error ? "Sign-in problem" : "Account not active yet",
        description: res.error
          ? res.error
          : res.status === "rejected"
            ? "Your account application was rejected. Please contact support."
            : "Your account is pending admin approval. You'll be notified once approved.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === "SIGNED_IN" && !passwordFlowInFlight) {
            // OAuth / magic-link sign-in: signIn() didn't run, so enforce here.
            // Deferred to avoid deadlocking the auth callback.
            setTimeout(async () => {
              const ok = await enforceApproval(session);
              if (ok) await fetchRole(session.user.id);
              setLoading(false);
            }, 0);
            return; // don't flip loading=false yet
          }
          await fetchRole(session.user.id);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Must finish before flipping loading=false, otherwise ProtectedRoute
        // sees role===null on fresh page loads and bounces to /login.
        await fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [passwordFlowInFlight]);



  const signIn = async (email: string, password: string) => {
    setPasswordFlowInFlight(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        return { error: { message: "Please verify your email address before signing in. Check your inbox for the verification link." } };
      }
      // Single source of truth for approval on password logins.
      const res = await checkApprovedWithRetry(data.user.id);
      if (!res.ok) {
        await supabase.auth.signOut();
        const msg = res.error
          ? res.error
          : res.status === "rejected"
            ? "Your account application was rejected. Please contact support."
            : "Your account is pending admin approval. You'll be notified once approved.";
        return { error: { message: msg } };
      }
      await fetchRole(data.user.id);
      return { error: null };
    } finally {
      setPasswordFlowInFlight(false);
    }
  };


  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
