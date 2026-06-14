import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((data?.role as UserRole) ?? null);
  };

  const checkApproved = async (userId: string): Promise<{ ok: boolean; status?: string }> => {
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (roleRow?.role === "admin") return { ok: true };
    if (roleRow?.role === "venue") {
      const { data: venues } = await supabase.from("venues").select("approval_status").eq("owner_id", userId);
      if (venues && venues.length > 0) {
        if (venues.some((v: any) => v.approval_status === "approved")) return { ok: true };
        if (venues.every((v: any) => v.approval_status === "rejected")) return { ok: false, status: "rejected" };
        return { ok: false, status: "pending" };
      }
    }
    const { data: profile } = await supabase.from("profiles").select("approval_status").eq("user_id", userId).maybeSingle();
    if (profile?.approval_status === "approved") return { ok: true };
    return { ok: false, status: profile?.approval_status ?? "pending" };
  };

  const enforceApproval = async (sess: Session): Promise<boolean> => {
    if (!sess.user.email_confirmed_at) {
      await supabase.auth.signOut();
      alert("Please verify your email before signing in.");
      return false;
    }
    const res = await checkApproved(sess.user.id);
    if (!res.ok) {
      await supabase.auth.signOut();
      alert(res.status === "rejected"
        ? "Your account application was rejected. Please contact support."
        : "Your account is pending admin approval. You'll be notified once approved.");
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
          // Defer to avoid deadlock; give the new-user trigger a moment for OAuth signups
          if (event === "SIGNED_IN") {
            setTimeout(async () => {
              await new Promise(r => setTimeout(r, 400));
              const ok = await enforceApproval(session);
              if (ok) fetchRole(session.user.id);
            }, 0);
          } else {
            setTimeout(() => fetchRole(session.user.id), 0);
          }
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return { error: { message: "Please verify your email address before signing in. Check your inbox for the verification link." } };
    }
    // Check admin approval (admins are auto-approved by trigger)
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
    if (roleRow?.role !== "admin") {
      const { data: profile } = await supabase.from("profiles").select("approval_status").eq("user_id", data.user.id).maybeSingle();
      if (profile?.approval_status !== "approved") {
        await supabase.auth.signOut();
        const msg = profile?.approval_status === "rejected"
          ? "Your account application was rejected. Please contact support."
          : "Your account is pending admin approval. You'll be notified once approved.";
        return { error: { message: msg } };
      }
    }
    return { error: null };
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
